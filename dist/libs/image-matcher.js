/**
 * ImageMatcher - Standalone JavaScript library for image similarity detection
 * Compatible with browsers and Chrome extensions (no eval)
 */
class ImageMatcher {
    constructor() {
        this.cache = new Map();
        this.workers = [];
        this.processingQueue = [];
        this.isProcessing = false;
    }

    /**
     * Process a single image and compute all similarity hashes
     * @param {HTMLImageElement|string} imageSource 
     * @param {string} imageId 
     * @returns {Promise<Object>} Image fingerprint data
     */
    async processImage(imageSource, imageId) {
        if (this.cache.has(imageId)) {
            return this.cache.get(imageId);
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let img;
        if (typeof imageSource === 'string') {
            img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = imageSource;
            });
        } else {
            img = imageSource;
        }

        // Set canvas dimensions
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const fingerprint = {
            id: imageId,
            width: img.width,
            height: img.height,
            aspectRatio: img.width / img.height,
            fileSize: imageSource.length || 0,
            
            // Multiple hash algorithms for different similarity types
            aHash: this.computeAverageHash(imageData),
            dHash: this.computeDifferenceHash(imageData),
            pHash: this.computePerceptualHash(imageData),
            
            // Color-based features
            colorHistogram: this.computeColorHistogram(imageData),
            dominantColors: this.extractDominantColors(imageData),
            
            // Structural features
            edgeHash: this.computeEdgeHash(imageData),
            
            // Metadata
            processedAt: Date.now()
        };

        this.cache.set(imageId, fingerprint);
        return fingerprint;
    }

    /**
     * Compute Average Hash (aHash) - good for exact duplicates
     */
    computeAverageHash(imageData) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 8;
        canvas.height = 8;
        
        // Resize to 8x8 grayscale
        ctx.drawImage(this.imageDataToCanvas(imageData), 0, 0, 8, 8);
        const smallImageData = ctx.getImageData(0, 0, 8, 8);
        
        const grayPixels = [];
        for (let i = 0; i < smallImageData.data.length; i += 4) {
            const gray = (smallImageData.data[i] + smallImageData.data[i + 1] + smallImageData.data[i + 2]) / 3;
            grayPixels.push(gray);
        }
        
        const average = grayPixels.reduce((a, b) => a + b) / grayPixels.length;
        
        let hash = '';
        for (let i = 0; i < grayPixels.length; i++) {
            hash += grayPixels[i] > average ? '1' : '0';
        }
        
        return hash;
    }

    /**
     * Compute Difference Hash (dHash) - good for crops and transformations
     */
    computeDifferenceHash(imageData) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 9;
        canvas.height = 8;
        
        ctx.drawImage(this.imageDataToCanvas(imageData), 0, 0, 9, 8);
        const smallImageData = ctx.getImageData(0, 0, 9, 8);
        
        const grayPixels = [];
        for (let i = 0; i < smallImageData.data.length; i += 4) {
            const gray = (smallImageData.data[i] + smallImageData.data[i + 1] + smallImageData.data[i + 2]) / 3;
            grayPixels.push(gray);
        }
        
        let hash = '';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const left = grayPixels[row * 9 + col];
                const right = grayPixels[row * 9 + col + 1];
                hash += left > right ? '1' : '0';
            }
        }
        
        return hash;
    }

    /**
     * Compute Perceptual Hash (pHash) - best for similar images with modifications
     */
    computePerceptualHash(imageData) {
        const size = 32;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = size;
        canvas.height = size;
        
        ctx.drawImage(this.imageDataToCanvas(imageData), 0, 0, size, size);
        const smallImageData = ctx.getImageData(0, 0, size, size);
        
        // Convert to grayscale
        const grayPixels = [];
        for (let i = 0; i < smallImageData.data.length; i += 4) {
            const gray = (smallImageData.data[i] + smallImageData.data[i + 1] + smallImageData.data[i + 2]) / 3;
            grayPixels.push(gray);
        }
        
        // Apply 2D DCT (Discrete Cosine Transform)
        const dctMatrix = this.computeDCT(grayPixels, size);
        
        // Extract top-left 8x8 of DCT matrix (low frequencies)
        const lowFreqs = [];
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                lowFreqs.push(dctMatrix[i * size + j]);
            }
        }
        
        // Compute median of low frequencies
        const sortedFreqs = [...lowFreqs].sort((a, b) => a - b);
        const median = sortedFreqs[Math.floor(sortedFreqs.length / 2)];
        
        // Generate hash based on median comparison
        let hash = '';
        for (let i = 0; i < lowFreqs.length; i++) {
            hash += lowFreqs[i] > median ? '1' : '0';
        }
        
        return hash;
    }

    /**
     * Compute simplified 2D DCT
     */
    computeDCT(pixels, size) {
        const dct = new Array(size * size).fill(0);
        
        for (let u = 0; u < size; u++) {
            for (let v = 0; v < size; v++) {
                let sum = 0;
                for (let i = 0; i < size; i++) {
                    for (let j = 0; j < size; j++) {
                        sum += pixels[i * size + j] * 
                               Math.cos(((2 * i + 1) * u * Math.PI) / (2 * size)) *
                               Math.cos(((2 * j + 1) * v * Math.PI) / (2 * size));
                    }
                }
                
                const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
                const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
                dct[u * size + v] = (1 / 4) * cu * cv * sum;
            }
        }
        
        return dct;
    }

    /**
     * Compute color histogram
     */
    computeColorHistogram(imageData) {
        const rHist = new Array(256).fill(0);
        const gHist = new Array(256).fill(0);
        const bHist = new Array(256).fill(0);
        
        for (let i = 0; i < imageData.data.length; i += 4) {
            rHist[imageData.data[i]]++;
            gHist[imageData.data[i + 1]]++;
            bHist[imageData.data[i + 2]]++;
        }
        
        // Normalize histograms
        const totalPixels = imageData.data.length / 4;
        return {
            r: rHist.map(count => count / totalPixels),
            g: gHist.map(count => count / totalPixels),
            b: bHist.map(count => count / totalPixels)
        };
    }

    /**
     * Extract dominant colors using k-means clustering
     */
    extractDominantColors(imageData, k = 5) {
        const pixels = [];
        
        // Sample pixels (every 10th pixel for performance)
        for (let i = 0; i < imageData.data.length; i += 40) {
            pixels.push([
                imageData.data[i],
                imageData.data[i + 1],
                imageData.data[i + 2]
            ]);
        }
        
        if (pixels.length === 0) return [];
        
        // Simple k-means clustering
        let centroids = [];
        for (let i = 0; i < k; i++) {
            const randomIndex = Math.floor(Math.random() * pixels.length);
            centroids.push([...pixels[randomIndex]]);
        }
        
        for (let iteration = 0; iteration < 10; iteration++) {
            const clusters = new Array(k).fill(null).map(() => []);
            
            // Assign pixels to nearest centroid
            for (const pixel of pixels) {
                let minDistance = Infinity;
                let nearestCluster = 0;
                
                for (let i = 0; i < centroids.length; i++) {
                    const distance = this.colorDistance(pixel, centroids[i]);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestCluster = i;
                    }
                }
                
                clusters[nearestCluster].push(pixel);
            }
            
            // Update centroids
            for (let i = 0; i < centroids.length; i++) {
                if (clusters[i].length > 0) {
                    const avgR = clusters[i].reduce((sum, p) => sum + p[0], 0) / clusters[i].length;
                    const avgG = clusters[i].reduce((sum, p) => sum + p[1], 0) / clusters[i].length;
                    const avgB = clusters[i].reduce((sum, p) => sum + p[2], 0) / clusters[i].length;
                    centroids[i] = [avgR, avgG, avgB];
                }
            }
        }
        
        return centroids.map(color => ({
            r: Math.round(color[0]),
            g: Math.round(color[1]),
            b: Math.round(color[2])
        }));
    }

    /**
     * Compute edge hash for structural comparison
     */
    computeEdgeHash(imageData) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 8;
        canvas.height = 8;
        
        ctx.drawImage(this.imageDataToCanvas(imageData), 0, 0, 8, 8);
        const smallImageData = ctx.getImageData(0, 0, 8, 8);
        
        // Convert to grayscale
        const gray = [];
        for (let i = 0; i < smallImageData.data.length; i += 4) {
            gray.push((smallImageData.data[i] + smallImageData.data[i + 1] + smallImageData.data[i + 2]) / 3);
        }
        
        // Apply simple edge detection (gradient)
        let hash = '';
        for (let y = 0; y < 7; y++) {
            for (let x = 0; x < 7; x++) {
                const current = gray[y * 8 + x];
                const right = gray[y * 8 + x + 1];
                const down = gray[(y + 1) * 8 + x];
                
                const gradientX = Math.abs(current - right);
                const gradientY = Math.abs(current - down);
                const gradient = Math.sqrt(gradientX * gradientX + gradientY * gradientY);
                
                hash += gradient > 30 ? '1' : '0';
            }
        }
        
        return hash;
    }

    /**
     * Helper: Convert ImageData to Canvas
     */
    imageDataToCanvas(imageData) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    /**
     * Helper: Calculate color distance
     */
    colorDistance(color1, color2) {
        const dr = color1[0] - color2[0];
        const dg = color1[1] - color2[1];
        const db = color1[2] - color2[2];
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    /**
     * Calculate Hamming distance between two binary strings
     */
    hammingDistance(hash1, hash2) {
        if (hash1.length !== hash2.length) return Infinity;
        
        let distance = 0;
        for (let i = 0; i < hash1.length; i++) {
            if (hash1[i] !== hash2[i]) {
                distance++;
            }
        }
        return distance;
    }

    /**
     * Compare color histograms using correlation coefficient
     */
    compareHistograms(hist1, hist2) {
        const channels = ['r', 'g', 'b'];
        let totalCorrelation = 0;
        
        for (const channel of channels) {
            const h1 = hist1[channel];
            const h2 = hist2[channel];
            
            // Calculate means
            const mean1 = h1.reduce((a, b) => a + b) / h1.length;
            const mean2 = h2.reduce((a, b) => a + b) / h2.length;
            
            // Calculate correlation coefficient
            let numerator = 0;
            let denominator1 = 0;
            let denominator2 = 0;
            
            for (let i = 0; i < h1.length; i++) {
                const diff1 = h1[i] - mean1;
                const diff2 = h2[i] - mean2;
                numerator += diff1 * diff2;
                denominator1 += diff1 * diff1;
                denominator2 += diff2 * diff2;
            }
            
            const correlation = numerator / Math.sqrt(denominator1 * denominator2);
            totalCorrelation += isNaN(correlation) ? 0 : correlation;
        }
        
        return totalCorrelation / channels.length;
    }

    /**
     * Compare two images and return similarity score (0-1)
     */
    compareImages(fingerprint1, fingerprint2) {
        // Hash-based similarities (lower Hamming distance = higher similarity)
        const maxHashLength = Math.max(fingerprint1.aHash.length, fingerprint1.dHash.length, fingerprint1.pHash.length);
        
        const aHashSimilarity = 1 - (this.hammingDistance(fingerprint1.aHash, fingerprint2.aHash) / maxHashLength);
        const dHashSimilarity = 1 - (this.hammingDistance(fingerprint1.dHash, fingerprint2.dHash) / maxHashLength);
        const pHashSimilarity = 1 - (this.hammingDistance(fingerprint1.pHash, fingerprint2.pHash) / maxHashLength);
        const edgeHashSimilarity = 1 - (this.hammingDistance(fingerprint1.edgeHash, fingerprint2.edgeHash) / fingerprint1.edgeHash.length);
        
        // Color-based similarity
        const histogramSimilarity = this.compareHistograms(fingerprint1.colorHistogram, fingerprint2.colorHistogram);
        
        // Structural similarity (aspect ratio, dimensions)
        const aspectRatioSimilarity = 1 - Math.abs(fingerprint1.aspectRatio - fingerprint2.aspectRatio) / Math.max(fingerprint1.aspectRatio, fingerprint2.aspectRatio);
        
        // Weighted combination of all similarities
        const weights = {
            aHash: 0.2,
            dHash: 0.2,
            pHash: 0.3,
            edgeHash: 0.1,
            histogram: 0.15,
            aspectRatio: 0.05
        };
        
        const totalSimilarity = 
            aHashSimilarity * weights.aHash +
            dHashSimilarity * weights.dHash +
            pHashSimilarity * weights.pHash +
            edgeHashSimilarity * weights.edgeHash +
            histogramSimilarity * weights.histogram +
            aspectRatioSimilarity * weights.aspectRatio;
        
        return {
            overall: Math.max(0, Math.min(1, totalSimilarity)),
            details: {
                aHash: aHashSimilarity,
                dHash: dHashSimilarity,
                pHash: pHashSimilarity,
                edgeHash: edgeHashSimilarity,
                histogram: histogramSimilarity,
                aspectRatio: aspectRatioSimilarity
            }
        };
    }

    /**
     * Find similar images in a collection
     */
    async findSimilarImages(images, similarityThreshold = 0.8, progressCallback = null) {
        const fingerprints = [];
        
        // Process all images
        for (let i = 0; i < images.length; i++) {
            if (progressCallback) {
                progressCallback({ phase: 'processing', current: i + 1, total: images.length });
            }
            
            const fingerprint = await this.processImage(images[i].src, images[i].id);
            fingerprints.push(fingerprint);
        }
        
        // Compare all pairs
        const groups = [];
        const processed = new Set();
        
        for (let i = 0; i < fingerprints.length; i++) {
            if (processed.has(fingerprints[i].id)) continue;
            
            const group = [fingerprints[i]];
            processed.add(fingerprints[i].id);
            
            for (let j = i + 1; j < fingerprints.length; j++) {
                if (processed.has(fingerprints[j].id)) continue;
                
                const similarity = this.compareImages(fingerprints[i], fingerprints[j]);
                
                if (similarity.overall >= similarityThreshold) {
                    group.push(fingerprints[j]);
                    processed.add(fingerprints[j].id);
                }
            }
            
            if (group.length > 1) {
                groups.push({
                    images: group,
                    count: group.length,
                    averageSimilarity: this.calculateGroupSimilarity(group)
                });
            }
            
            if (progressCallback) {
                progressCallback({ phase: 'comparing', current: i + 1, total: fingerprints.length });
            }
        }
        
        return groups.sort((a, b) => b.count - a.count);
    }

    /**
     * Calculate average similarity within a group
     */
    calculateGroupSimilarity(group) {
        if (group.length < 2) return 1;
        
        let totalSimilarity = 0;
        let comparisons = 0;
        
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                const similarity = this.compareImages(group[i], group[j]);
                totalSimilarity += similarity.overall;
                comparisons++;
            }
        }
        
        return comparisons > 0 ? totalSimilarity / comparisons : 1;
    }

    /**
     * Clear cache to free memory
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get processing statistics
     */
    getStats() {
        return {
            cachedImages: this.cache.size,
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    /**
     * Estimate memory usage
     */
    estimateMemoryUsage() {
        let totalSize = 0;
        for (const [key, value] of this.cache) {
            totalSize += JSON.stringify(value).length;
        }
        return totalSize;
    }
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageMatcher;
} else if (typeof window !== 'undefined') {
    window.ImageMatcher = ImageMatcher;
}