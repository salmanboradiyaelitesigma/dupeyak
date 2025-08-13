// DupeYak Duplicate Remover Duplicate Remover - Content Script
// Runs on:
// - https://photos.google.com/search/* and https://photos.google.com/u/*/search/* pages
// - https://photos.google.com/album/* and https://photos.google.com/u/*/album/* pages  
// - https://photos.google.com/share/* and https://photos.google.com/u/*/share/* pages


 import $ from 'jquery';
 import 'jquery-ui-dist/jquery-ui';
 import { QualityAssessor } from "../js/quality-assestor";
 
// Utility function to check if current URL is a valid DupeYak Duplicate Remover page for the extension
function isValidGooglePhotosPage(url = window.location.href) {
    // Check for search, album, and share URLs (both standard and account-specific)
    return url.includes('photos.google.com/search') ||
        url.match(/photos\.google\.com\/u\/\d+\/search/) ||
        url.includes('photos.google.com/album') ||
        url.match(/photos\.google\.com\/u\/\d+\/album/) ||
        url.includes('photos.google.com/share') ||
        url.match(/photos\.google\.com\/u\/\d+\/share/);
}

// Frontend Session Management
class FrontendSessionManager {
    constructor() {
        this.sessions = {};
        this.currentSessionId = null;
        this.imageMatcherLoaded = false;
        this.imageMatcher = null;
        this.libraryLoadPromise = this.loadImageMatcher();
    }

    async loadImageMatcher() {
        try {
            // Since the library is loaded via manifest.json, just verify it's available
            if (typeof window.ImageMatcher !== 'undefined') {
                this.imageMatcher = new window.ImageMatcher();
                this.imageMatcherLoaded = true;
                // //console.log('✅ ImageMatcher library loaded successfully via manifest');
                // //console.log('📋 ImageMatcher instance created');
                return Promise.resolve();
            } else {
                console.error('❌ ImageMatcher library not available', {
                    ImageMatcher: typeof window.ImageMatcher
                });
                throw new Error('ImageMatcher library not available');
            }
        } catch (error) {
            console.error('❌ Error verifying ImageMatcher library:', error);
            throw error;
        }
    }

    createSession() {
        const sessionId = this.generateSessionId();
        const session = {
            id: sessionId,
            created_at: new Date().toISOString(),
            status: 'active',
            images: [],
            imageHashes: {}, // Store computed hashes
            total_images: 0,
            processed_images: 0,
            analysis_status: 'ready',
            similar_groups: [],
            last_analysis: null,
            similarity_threshold: 85
        };

        this.sessions[sessionId] = session;
        this.currentSessionId = sessionId;
        console.log(`📝 Created frontend session: ${sessionId}`);
        return sessionId;
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async addImage(sessionId, imageId, imageData) {
        const session = this.sessions[sessionId];
        if (!session) {
            return { success: false, error: 'Session not found' };
        }

        if (session.status !== 'active') {
            return { success: false, error: 'Session is not active' };
        }

        try {
            console.log(`🖼️ Processing image ${imageId} for session ${sessionId}...`);

            // Use base64 data URL directly for console output (more reliable than blob URLs)
            const base64DataUrl = imageData; // This is already a complete data:image/... URL
            const mimeType = imageData.match(/data:([^;]+)/)?.[1] || 'image/png';
            const base64Size = Math.round((imageData.length * 3) / 4); // Approximate size in bytes

            console.log(`📊 Image data info:`, {
                imageId: imageId,
                size: `${(base64Size / 1024).toFixed(2)} KB`,
                type: mimeType
            });

            // Display image in console using base64 data URL
            this.displayImageInConsole(imageId, base64DataUrl, base64Size, mimeType);

            // Convert base64 to image element for hash computation
            const img = await this.createImageFromBase64(imageData);

            // Wait for ImageMatcher library to be loaded
            await this.waitForImageMatcher();

            // Compute image fingerprint using ImageMatcher
            console.log(`🔢 Computing image fingerprint for ${imageId}...`);
            const frontendStartTime = Date.now();
            const fingerprint = await this.imageMatcher.processImage(img, imageId);
            const frontendHashTime = Date.now() - frontendStartTime;
            console.log(`✅ Computed image fingerprint for ${imageId} in ${frontendHashTime}ms`);

            // Store image info and hashes (frontend only)
            const imageInfo = {
                id: imageId,
                added_at: new Date().toISOString(),
                processed: true,
                width: img.naturalWidth,
                height: img.naturalHeight,
                hash_cached: true
            };

            session.images.push(imageInfo);
            session.imageHashes[imageId] = fingerprint;
            session.total_images = session.images.length;

            console.log(`✅ Added image ${imageId} to frontend session ${sessionId}`);
            console.log(`  - Dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
            console.log(`  - aHash: ${fingerprint.aHash}`);
            console.log(`  - dHash: ${fingerprint.dHash}`);
            console.log(`  - pHash: ${fingerprint.pHash}`);
            console.log(`  - edgeHash: ${fingerprint.edgeHash}`);

            return { success: true, message: 'Image added successfully' };

        } catch (error) {
            console.error(`❌ Error adding image to session ${sessionId}:`, error);
            return { success: false, error: `Failed to process image: ${error.message}` };
        }
    }



    async waitForImageMatcher() {
        try {
            // Since library is loaded via manifest, just verify it's ready
            if (this.imageMatcherLoaded && this.imageMatcher) {
                console.log(`✅ ImageMatcher library confirmed ready`);
                return;
            }

            console.error(`❌ ImageMatcher library not ready`, {
                imageMatcherLoaded: this.imageMatcherLoaded,
                imageMatcher: !!this.imageMatcher
            });
            throw new Error('ImageMatcher library not ready');
        } catch (error) {
            console.error('❌ Error waiting for ImageMatcher library:', error);
            throw error;
        }
    }

    async createImageFromBase64(base64Data) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const timeout = 5000; // 5 second timeout

            const timer = setTimeout(() => {
                console.error('❌ Image creation timeout');
                reject(new Error('Image creation timeout'));
            }, timeout);

            img.onload = () => {
                clearTimeout(timer);
                console.log(`✅ Image created: ${img.naturalWidth}x${img.naturalHeight}`);
                resolve(img);
            };

            img.onerror = (error) => {
                clearTimeout(timer);
                console.error('❌ Image creation failed:', error);
                reject(error);
            };

            img.crossOrigin = 'anonymous';
            img.src = base64Data;
            console.log(`📸 Creating image from base64 (${base64Data.length} chars)...`);
        });
    }

    validateHashQuality(hexHash) {
        // Check if hash is all zeros, all ones, or has very low entropy
        if (hexHash === '0000000000000000' || hexHash === 'ffffffffffffffff') {
            return false;
        }

        // Count bit diversity - should have reasonable mix of 0s and 1s
        let onesCount = 0;
        for (let i = 0; i < hexHash.length; i++) {
            const nibble = parseInt(hexHash[i], 16);
            onesCount += (nibble & 1) + ((nibble >> 1) & 1) + ((nibble >> 2) & 1) + ((nibble >> 3) & 1);
        }

        const totalBits = hexHash.length * 4;
        const onesRatio = onesCount / totalBits;

        // Good hash should have between 20% and 80% ones
        return onesRatio >= 0.2 && onesRatio <= 0.8;
    }



    async analyzeSession(sessionId, similarityThreshold = 75) {
        const session = this.sessions[sessionId];
        if (!session) {
            throw new Error('Session not found');
        }

        console.log(`🎯 Starting frontend analysis for session ${sessionId}`);
        const analysisStartTime = Date.now();

        session.analysis_status = 'analyzing';
        session.similarity_threshold = similarityThreshold;
        session.processed_images = 0;

        const threshold = similarityThreshold / 100.0; // Convert percentage to decimal
        console.log(`🎯 Using ${similarityThreshold}% similarity threshold (${threshold} decimal)`);

        try {
            const images = session.images;
            const totalImages = images.length;
            const totalComparisons = totalImages * (totalImages - 1) / 2;

            console.log(`🔍 Analyzing ${totalImages} images (${totalComparisons} comparisons)...`);

            const comparisons = [];
            let completedComparisons = 0;

            // Add progress callback for UI updates
            const progressCallback = this.progressCallback || (() => { });

            console.log(`🔄 Starting hash comparison phase...`);
            progressCallback(10, `Comparing ${totalComparisons.toLocaleString()} hash pairs...`);

            // Compare each pair of images with batching to prevent browser freeze
            const batchSize = 1000; // Process 1000 comparisons at a time
            let batchCount = 0;

            for (let i = 0; i < totalImages; i++) {
                for (let j = i + 1; j < totalImages; j++) {
                    const img1Info = images[i];
                    const img2Info = images[j];

                    const img1Fingerprint = session.imageHashes[img1Info.id];
                    const img2Fingerprint = session.imageHashes[img2Info.id];

                    if (img1Fingerprint && img2Fingerprint) {
                        const similarity = this.calculateSimilarityFromHashes(img1Fingerprint, img2Fingerprint, threshold);

                        if (similarity && similarity.is_similar) {
                            comparisons.push({
                                image1_index: i,
                                image2_index: j,
                                image1_id: img1Info.id,
                                image2_id: img2Info.id,
                                similarity: similarity
                            });

                            console.log(`🎯 MATCH: ${img1Info.id} ↔ ${img2Info.id} (score: ${similarity.combined_score.toFixed(3)})`);
                        }
                    }

                    completedComparisons++;
                    batchCount++;

                    // Update progress and yield control to prevent browser freeze
                    if (batchCount >= batchSize) {
                        const progress = 10 + (completedComparisons / totalComparisons) * 80; // 10-90% for comparison phase
                        session.processed_images = completedComparisons;
                        session.analysis_progress = progress;

                        const remainingComparisons = totalComparisons - completedComparisons;
                        const matchesFound = comparisons.length;

                        console.log(`📊 Progress: ${completedComparisons.toLocaleString()}/${totalComparisons.toLocaleString()} comparisons (${progress.toFixed(1)}%) - ${matchesFound} matches found`);
                        progressCallback(progress, `Comparing hashes: ${completedComparisons.toLocaleString()}/${totalComparisons.toLocaleString()} (${matchesFound} matches found)`);

                        // Yield control to prevent browser freeze
                        await new Promise(resolve => setTimeout(resolve, 1));
                        batchCount = 0;
                    }
                }
            }

            // Final progress update for comparison phase
            const finalProgress = 90;
            session.analysis_progress = finalProgress;
            progressCallback(finalProgress, `Hash comparison complete! Found ${comparisons.length} similar pairs. Grouping results...`);

            // Group similar images
            console.log(`🔄 Grouping ${comparisons.length} similar pairs into groups...`);
            progressCallback(95, `Grouping ${comparisons.length} similar pairs...`);

            const similarGroups = this.groupSimilarImages(comparisons);

            // Update session with results
            session.analysis_status = 'completed';
            session.processed_images = totalImages;
            session.similar_groups = similarGroups;
            session.total_comparisons = totalComparisons;
            session.similar_pairs_found = comparisons.length;
            session.last_analysis = new Date().toISOString();
            session.analysis_progress = 100;

            progressCallback(100, `Analysis complete! Found ${similarGroups.length} groups of similar photos.`);

            const analysisTime = Date.now() - analysisStartTime;
            console.log(`🚀 Frontend analysis completed for session ${sessionId}:`);
            console.log(`  📊 Total comparisons made: ${totalComparisons}`);
            console.log(`  🎯 Similar pairs found: ${comparisons.length}`);
            console.log(`  📁 Similar groups found: ${similarGroups.length}`);
            console.log(`  ⏱️ Analysis time: ${analysisTime}ms`);

        //  const quality = await this.assessImageQuality(session, 300);
        //  console.log('quality__assessImageQuality',quality);
            return {
                success: true,
                session_id: sessionId,
                total_images: totalImages,
                similar_groups: similarGroups,
                total_comparisons: totalComparisons,
                similar_pairs_found: comparisons.length,
                analysis_time: analysisTime
            };

        } catch (error) {
            console.error(`❌ Error during frontend analysis:`, error);
            session.analysis_status = 'error';
            session.error = error.message;
            throw error;
        }
    }

    
//   async assessImageQuality(imageFile, processingSize = 300) {
//     // await this.initializeFaceApi();

//     const technical = await this.analyzeTechnicalQuality(imageFile, processingSize);
//    console.log("technical >>>",technical);
//    return;
//     const faces = await this.analyzeFaceQuality(imageFile);

//     const overallScore = this.calculateOverallScore(technical, faces);
//     const qualityTier = this.getQualityTier(overallScore);

//     return {
//       overallScore,
//       qualityTier,
//       technical,
//       faces,
//     };
//   }

//   analyzeTechnicalQuality(imageFile, processingSize = 300) {
//     return new Promise((resolve, reject) => {
//       if (!imageFile || !imageFile.type || !imageFile.type.startsWith('image/') || !imageFile.size || !imageFile.name) {
//         reject(new Error('Invalid file object or not an image'));
//         return;
//       }

//       const img = new Image();
//       let objectUrl = null;

//       img.onload = () => {
//         try {
//           const canvas = document.createElement('canvas');
//           const ctx = canvas.getContext('2d');

//           canvas.width = processingSize;
//           canvas.height = processingSize;

//           ctx.imageSmoothingEnabled = true;
//           ctx.imageSmoothingQuality = 'high';
//           ctx.drawImage(img, 0, 0, processingSize, processingSize);

//           const imageData = ctx.getImageData(0, 0, processingSize, processingSize);

//           const blurScore = this.calculateBlurScore(imageData);
//           const exposureQuality = this.calculateExposureQuality(imageData);
//           const contrastScore = this.calculateContrastScore(imageData);
//           const noiseLevel = this.calculateNoiseLevel(imageData);
//           const sharpnessScore = this.calculateSharpnessScore(imageData);
//           const colorBalance = this.calculateColorBalance(imageData);

//           if (objectUrl) {
//             URL.revokeObjectURL(objectUrl);
//           }

//           resolve({
//             blurScore,
//             exposureQuality,
//             contrastScore,
//             noiseLevel,
//             sharpnessScore,
//             colorBalance,
//           });
//         } catch (error) {
//           if (objectUrl) {
//             URL.revokeObjectURL(objectUrl);
//           }
//           reject(error);
//         }
//       };

//       img.onerror = (error) => {
//         if (objectUrl) {
//           URL.revokeObjectURL(objectUrl);
//         }
//         reject(error);
//       };

//       try {
//         objectUrl = URL.createObjectURL(imageFile);
//         img.src = objectUrl;
//       } catch (error) {
//         reject(new Error(`Failed to create object URL for file: ${imageFile.name}`));
//       }
//     });
//   }

//   async analyzeFaceQuality(imageFile) {
//     if (!this.faceapiInitialized) {
//       console.log('Face-api.js not initialized, skipping face detection');
//       return undefined;
//     }

//     try {
//       const img = await this.loadImageElement(imageFile);

//       console.log('Running Tiny Face Detector with facial landmarks...');
//       let detectionsWithLandmarks = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({
//         scoreThreshold: 0.2,
//         inputSize: 416
//       })).withFaceLandmarks(true);

//       if (detectionsWithLandmarks.length === 0) {
//         console.log('No faces with default settings, trying more sensitive detection...');
//         detectionsWithLandmarks = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({
//           scoreThreshold: 0.1,
//           inputSize: 320
//         })).withFaceLandmarks(true);
//       }

//       if (detectionsWithLandmarks.length === 0) {
//         console.log('Still no faces, trying largest input size...');
//         detectionsWithLandmarks = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({
//           scoreThreshold: 0.1,
//           inputSize: 512
//         })).withFaceLandmarks(true);
//       }

//       if (detectionsWithLandmarks.length === 0) {
//         console.log('No faces detected by Tiny Face Detector');
//         return undefined;
//       }

//       console.log(`✅ Detected ${detectionsWithLandmarks.length} face(s) with landmarks using Tiny Face Detector!`);

//       const faceWithLandmarks = detectionsWithLandmarks[0];
//       const box = faceWithLandmarks.detection.box;
//       const landmarks = faceWithLandmarks.landmarks;

//       const faceSize = this.calculateFaceSize(box, img.width, img.height);
//       const faceCentering = this.calculateFaceCentering(box, img.width, img.height);
//       const lightingQuality = await this.calculateFaceLighting(img, box);
//       const eyeContactScore = this.calculateEyeContactScore(landmarks);

//       const portraitScore = (faceSize + faceCentering + lightingQuality + eyeContactScore) / 4;

//       return {
//         faceCount: detectionsWithLandmarks.length,
//         eyeContactScore,
//         faceCentering,
//         faceSize,
//         lightingQuality,
//         portraitScore,
//       };
//     } catch (error) {
//       console.error('Face detection with landmarks failed:', error);
//       console.error('Error details:', error instanceof Error ? error.message : String(error));
//       return undefined;
//     }
//   }

//   async detectFaceSimplified(img) {
//     const canvas = document.createElement('canvas');
//     const ctx = canvas.getContext('2d');

//     canvas.width = 300;
//     canvas.height = 300;

//     ctx.drawImage(img, 0, 0, 300, 300);
//     const imageData = ctx.getImageData(0, 0, 300, 300);

//     const faceIndicators = this.calculateFaceIndicators(imageData);

//     const hasFace = faceIndicators.confidence > 0.3;

//     if (!hasFace) {
//       return {
//         hasFace: false,
//         eyeContactScore: 0,
//         faceCentering: 0,
//         faceSize: 0,
//         lightingQuality: 0,
//         portraitScore: 0,
//       };
//     }

//     const faceCentering = faceIndicators.centerWeight;
//     const faceSize = faceIndicators.faceSize;
//     const lightingQuality = faceIndicators.lightingQuality;
//     const eyeContactScore = faceIndicators.eyeRegionQuality;
//     const portraitScore = (faceCentering + faceSize + lightingQuality + eyeContactScore) / 4;

//     return {
//       hasFace: true,
//       eyeContactScore,
//       faceCentering,
//       faceSize,
//       lightingQuality,
//       portraitScore,
//     };
//   }

//   calculateFaceIndicators(imageData) {
//     const data = imageData.data;
//     const width = imageData.width;
//     const height = imageData.height;

//     const centerRegion = this.analyzeRegion(data, width, height, 0.25, 0.25, 0.5, 0.5);
//     const upperCenterRegion = this.analyzeRegion(data, width, height, 0.2, 0.15, 0.6, 0.4);
//     const eyeRegion = this.analyzeRegion(data, width, height, 0.15, 0.2, 0.7, 0.3);

//     let confidence = 0;

//     if (centerRegion.avgBrightness > 80 && centerRegion.avgBrightness < 200) {
//       confidence += 0.3;
//     }

//     if (centerRegion.contrast > 15) {
//       confidence += 0.2;
//     }

//     const lowerCenterRegion = this.analyzeRegion(data, width, height, 0.25, 0.5, 0.5, 0.4);
//     if (upperCenterRegion.avgBrightness > lowerCenterRegion.avgBrightness) {
//       confidence += 0.2;
//     }

//     if (eyeRegion.darkPixelRatio > 0.1) {
//       confidence += 0.3;
//     }

//     const centerWeight = Math.min(100, confidence * 100 + 50);
//     const faceSize = Math.min(100, (centerRegion.pixelCount / (width * height)) * 400);
//     const lightingQuality = Math.min(100, 100 - Math.abs(centerRegion.avgBrightness - 140) / 2);
//     const eyeRegionQuality = Math.min(100, eyeRegion.contrast * 2 + 40);

//     return {
//       confidence,
//       centerWeight,
//       faceSize,
//       lightingQuality,
//       eyeRegionQuality,
//     };
//   }

//   analyzeRegion(data, width, height, x, y, w, h) {
//     const startX = Math.floor(x * width);
//     const startY = Math.floor(y * height);
//     const endX = Math.floor((x + w) * width);
//     const endY = Math.floor((y + h) * height);

//     let totalBrightness = 0;
//     let brightnessValues = [];
//     let darkPixels = 0;
//     let pixelCount = 0;

//     for (let py = startY; py < endY; py++) {
//       for (let px = startX; px < endX; px++) {
//         const idx = (py * width + px) * 4;
//         const brightness = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

//         totalBrightness += brightness;
//         brightnessValues.push(brightness);
//         if (brightness < 80) darkPixels++;
//         pixelCount++;
//       }
//     }

//     const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 0;

//     let variance = 0;
//     for (const brightness of brightnessValues) {
//       variance += Math.pow(brightness - avgBrightness, 2);
//     }
//     const contrast = pixelCount > 0 ? Math.sqrt(variance / pixelCount) : 0;

//     const darkPixelRatio = pixelCount > 0 ? darkPixels / pixelCount : 0;

//     return {
//       avgBrightness,
//       contrast,
//       darkPixelRatio,
//       pixelCount,
//     };
//   }

//   loadImageElement(imageFile) {
//     return new Promise((resolve, reject) => {
//       const img = new Image();
//       let objectUrl = null;

//       img.onload = () => {
//         if (objectUrl) {
//           URL.revokeObjectURL(objectUrl);
//         }
//         resolve(img);
//       };

//       img.onerror = (error) => {
//         if (objectUrl) {
//           URL.revokeObjectURL(objectUrl);
//         }
//         reject(error);
//       };

//       try {
//         objectUrl = URL.createObjectURL(imageFile);
//         img.src = objectUrl;
//       } catch (error) {
//         reject(error);
//       }
//     });
//   }

//   calculateFaceSize(box, imgWidth, imgHeight) {
//     const faceArea = box.width * box.height;
//     const imageArea = imgWidth * imgHeight;
//     const faceRatio = faceArea / imageArea;

//     if (faceRatio >= 0.15 && faceRatio <= 0.25) {
//       return 100;
//     } else if (faceRatio >= 0.10 && faceRatio <= 0.35) {
//       return 80;
//     } else if (faceRatio >= 0.05 && faceRatio <= 0.45) {
//       return 60;
//     } else {
//       return 40;
//     }
//   }

//   calculateFaceCentering(box, imgWidth, imgHeight) {
//     const faceCenterX = box.x + box.width / 2;
//     const faceCenterY = box.y + box.height / 2;
//     const imageCenterX = imgWidth / 2;
//     const imageCenterY = imgHeight / 2;

//     const distanceFromCenter = Math.sqrt(
//       Math.pow(faceCenterX - imageCenterX, 2) + Math.pow(faceCenterY - imageCenterY, 2)
//     );

//     const maxDistance = Math.sqrt(Math.pow(imgWidth / 2, 2) + Math.pow(imgHeight / 2, 2));
//     const centeringScore = Math.max(0, 100 - (distanceFromCenter / maxDistance) * 100);

//     return centeringScore;
//   }

//   async calculateFaceLighting(img, box) {
//     const canvas = document.createElement('canvas');
//     const ctx = canvas.getContext('2d');

//     canvas.width = box.width;
//     canvas.height = box.height;

//     ctx.drawImage(img, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
//     const imageData = ctx.getImageData(0, 0, box.width, box.height);

//     const data = imageData.data;
//     let totalBrightness = 0;
//     let brightnessValues = [];

//     for (let i = 0; i < data.length; i += 4) {
//       const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
//       totalBrightness += brightness;
//       brightnessValues.push(brightness);
//     }

//     const avgBrightness = totalBrightness / brightnessValues.length;

//     let variance = 0;
//     for (const brightness of brightnessValues) {
//       variance += Math.pow(brightness - avgBrightness, 2);
//     }
//     const stdDev = Math.sqrt(variance / brightnessValues.length);

//     let lightingScore = 50;

//     if (avgBrightness >= 80 && avgBrightness <= 160) {
//       lightingScore += 30;
//     } else if (avgBrightness >= 60 && avgBrightness <= 180) {
//       lightingScore += 20;
//     } else {
//       lightingScore += 10;
//     }

//     if (stdDev >= 20 && stdDev <= 50) {
//       lightingScore += 20;
//     } else if (stdDev >= 15 && stdDev <= 60) {
//       lightingScore += 15;
//     } else {
//       lightingScore += 5;
//     }

//     return Math.min(100, lightingScore);
//   }

//   calculateEyeContactScore(landmarks) {
//     const leftEye = landmarks.getLeftEye();
//     const rightEye = landmarks.getRightEye();

//     if (!leftEye || !rightEye || leftEye.length === 0 || rightEye.length === 0) {
//       return 50;
//     }

//     let eyeContactScore = 0;

//     const leftEyeOpenness = this.calculateEyeOpenness(leftEye);
//     const rightEyeOpenness = this.calculateEyeOpenness(rightEye);
//     const avgEyeOpenness = (leftEyeOpenness + rightEyeOpenness) / 2;

//     if (avgEyeOpenness > 0.3) {
//       eyeContactScore += 40;
//     } else if (avgEyeOpenness > 0.2) {
//       eyeContactScore += 25;
//     } else if (avgEyeOpenness > 0.1) {
//       eyeContactScore += 10;
//     }

//     const eyeSymmetry = 1 - Math.abs(leftEyeOpenness - rightEyeOpenness);
//     eyeContactScore += eyeSymmetry * 30;

//     const jawLine = landmarks.getJawOutline();
//     if (jawLine && jawLine.length > 0) {
//       const eyeAlignment = this.calculateEyeAlignment(leftEye, rightEye, jawLine);
//       eyeContactScore += eyeAlignment * 20;
//     } else {
//       eyeContactScore += 15;
//     }

//     const gazeScore = this.approximateGazeDirection(leftEye, rightEye);
//     eyeContactScore += gazeScore * 10;

//     console.log('Eye contact analysis:', {
//       leftEyeOpenness: leftEyeOpenness.toFixed(3),
//       rightEyeOpenness: rightEyeOpenness.toFixed(3),
//       eyeSymmetry: eyeSymmetry.toFixed(3),
//       finalScore: Math.min(100, eyeContactScore).toFixed(2)
//     });

//     return Math.min(100, eyeContactScore);
//   }

//   calculateEyeOpenness(eyePoints) {
//     if (eyePoints.length < 6) return 0;

//     const p1 = eyePoints[0];
//     const p2 = eyePoints[1];
//     const p3 = eyePoints[2];
//     const p4 = eyePoints[3];
//     const p5 = eyePoints[4];
//     const p6 = eyePoints[5];

//     const d1 = Math.sqrt(Math.pow(p2.x - p6.x, 2) + Math.pow(p2.y - p6.y, 2));
//     const d2 = Math.sqrt(Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2));
//     const d3 = Math.sqrt(Math.pow(p1.x - p4.x, 2) + Math.pow(p1.y - p4.y, 2));

//     if (d3 === 0) return 0;

//     const ear = (d1 + d2) / (2 * d3);

//     return Math.min(1, Math.max(0, ear / 0.3));
//   }

// calculateEyeAlignment(leftEye, rightEye, jawLine) {
//   if (leftEye.length === 0 || rightEye.length === 0 || jawLine.length === 0) return 0.75;

//   // Get eye centers
//   const leftEyeCenter = this.getEyeCenter(leftEye);
//   const rightEyeCenter = this.getEyeCenter(rightEye);

//   // Calculate the angle between the eyes
//   const eyeAngle = Math.atan2(
//     rightEyeCenter.y - leftEyeCenter.y,
//     rightEyeCenter.x - leftEyeCenter.x
//   );

//   // Good alignment is when eyes are roughly horizontal (angle close to 0)
//   const angleDifference = Math.abs(eyeAngle);
//   const alignmentScore = Math.max(0, 1 - (angleDifference / (Math.PI / 6))); // Penalize angles > 30 degrees

//   return alignmentScore;
// }
// calculateOverallScore(technical, faces) {
//   let score = 0;

//   // Base technical quality weights
//   const baseWeights = {
//     blur: 0.20,      // Reduced from 25% to 20%
//     sharpness: 0.15, // Reduced from 20% to 15%
//     exposure: 0.15,
//     contrast: 0.12,
//     noise: 0.08,
//     colorBalance: 0.05
//   };

//   // Apply base technical scores (85% total weight)
//   score += technical.blurScore * baseWeights.blur;
//   score += technical.sharpnessScore * baseWeights.sharpness;
//   score += technical.exposureQuality * baseWeights.exposure;
//   score += technical.contrastScore * baseWeights.contrast;
//   score += technical.noiseLevel * baseWeights.noise;
//   score += technical.colorBalance * baseWeights.colorBalance;

//   // Face quality bonus (27% weight if faces present)
//   if (faces && faces.faceCount > 0) {
//     const faceBonus = (
//       faces.faceCentering * 0.05 +
//       faces.faceSize * 0.04 +
//       faces.lightingQuality * 0.03 +
//       faces.portraitScore * 0.02 +
//       faces.eyeContactScore * 0.13
//     );
//     score += faceBonus;

//     console.log('Face quality detected:', {
//       faceCount: faces.faceCount,
//       faceCentering: faces.faceCentering.toFixed(2),
//       faceSize: faces.faceSize.toFixed(2),
//       lightingQuality: faces.lightingQuality.toFixed(2),
//       faceBonus: faceBonus.toFixed(4)
//     });
//   }

//   return Math.max(0, Math.min(100, score));
// }
// getQualityTier(score) {
//   if (score >= 85) return 'excellent';
//   if (score >= 70) return 'good';
//   if (score >= 50) return 'fair';
//   return 'poor';
// }
    calculateSimilarityFromHashes(fingerprint1, fingerprint2, similarityThreshold = 0.85) {
        try {
            // Use ImageMatcher's compareImages method for sophisticated similarity analysis
            const comparison = this.imageMatcher.compareImages(fingerprint1, fingerprint2);

            const isSimilar = comparison.overall >= similarityThreshold;

            // Only log detailed comparison info for matches to reduce console spam
            if (isSimilar) {
                console.log(`🎯 MATCH FOUND! Overall similarity: ${comparison.overall.toFixed(3)}`);
                console.log(`  aHash: ${comparison.details.aHash.toFixed(3)}, dHash: ${comparison.details.dHash.toFixed(3)}, pHash: ${comparison.details.pHash.toFixed(3)}`);
                console.log(`  edgeHash: ${comparison.details.edgeHash.toFixed(3)}, histogram: ${comparison.details.histogram.toFixed(3)}, aspectRatio: ${comparison.details.aspectRatio.toFixed(3)}`);
            }

            return {
                combined_score: comparison.overall,
                phash_score: comparison.details.pHash,
                ahash_score: comparison.details.aHash,
                dhash_score: comparison.details.dHash,
                edge_score: comparison.details.edgeHash,
                histogram_score: comparison.details.histogram,
                aspect_ratio_score: comparison.details.aspectRatio,
                is_similar: isSimilar
            };

        } catch (error) {
            console.error('❌ Error calculating similarity from fingerprints:', error);
            console.error('Fingerprint1:', fingerprint1);
            console.error('Fingerprint2:', fingerprint2);
            console.error('Threshold:', similarityThreshold);
            return null;
        }
    }

    groupSimilarImages(comparisons) {
        // Build a graph of similar image connections
        const connections = {};
        const imageIdToIndex = {};

        // Initialize connections and build index mapping
        for (const comparison of comparisons) {
            if (comparison.similarity.is_similar) {
                const img1Idx = comparison.image1_index;
                const img2Idx = comparison.image2_index;
                const img1Id = comparison.image1_id;
                const img2Id = comparison.image2_id;

                // Build index mapping
                imageIdToIndex[img1Id] = img1Idx;
                imageIdToIndex[img2Id] = img2Idx;

                // Add connections (undirected graph)
                if (!connections[img1Idx]) connections[img1Idx] = [];
                if (!connections[img2Idx]) connections[img2Idx] = [];

                connections[img1Idx].push(img2Idx);
                connections[img2Idx].push(img1Idx);
            }
        }

        // Find connected components using DFS
        const visited = new Set();
        const similarGroups = [];

        const dfs = (node, currentGroup) => {
            if (visited.has(node)) return;
            visited.add(node);
            currentGroup.push(node);

            // Visit all connected nodes
            for (const neighbor of (connections[node] || [])) {
                if (!visited.has(neighbor)) {
                    dfs(neighbor, currentGroup);
                }
            }
        };

        // Process each unvisited node
        for (const node in connections) {
            const nodeIndex = parseInt(node);
            if (!visited.has(nodeIndex)) {
                const currentGroup = [];
                dfs(nodeIndex, currentGroup);

                if (currentGroup.length >= 2) {
                    // Convert indices back to image IDs
                    const indexToId = {};
                    for (const [id, index] of Object.entries(imageIdToIndex)) {
                        indexToId[index] = id;
                    }
                    const imageIds = currentGroup.map(idx => indexToId[idx]);

                    // Calculate average similarity score for the group
                    const groupSimilarities = [];
                    for (const comparison of comparisons) {
                        if (comparison.similarity.is_similar &&
                            currentGroup.includes(comparison.image1_index) &&
                            currentGroup.includes(comparison.image2_index)) {
                            groupSimilarities.push(comparison.similarity.combined_score);
                        }
                    }

                    const avgSimilarity = groupSimilarities.length > 0
                        ? groupSimilarities.reduce((a, b) => a + b) / groupSimilarities.length
                        : 0.85;

                    const group = {
                        image_ids: imageIds,
                        image_indices: currentGroup,
                        similarity_score: avgSimilarity,
                        group_size: currentGroup.length,
                        internal_connections: groupSimilarities.length
                    };
                    similarGroups.push(group);

                    console.log(`📊 Found similarity group of ${currentGroup.length} images with ${groupSimilarities.length} connections (avg similarity: ${avgSimilarity.toFixed(3)})`);
                }
            }
        }

        console.log(`🎯 Total similarity groups found: ${similarGroups.length}`);
        return similarGroups;
    }

    getSessionStatus(sessionId) {
        const session = this.sessions[sessionId];
        if (!session) return null;

        return {
            session_id: sessionId,
            status: session.status,
            analysis_status: session.analysis_status,
            total_images: session.total_images,
            processed_images: session.processed_images || 0,
            analysis_progress: session.analysis_progress || 0,
            similar_groups: session.similar_groups || [],
            total_comparisons: session.total_comparisons || 0,
            similar_pairs_found: session.similar_pairs_found || 0,
            last_analysis: session.last_analysis,
            created_at: session.created_at
        };
    }

    async base64ToBlob(base64Data, mimeType) {
        // Remove data URL prefix if present
        const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

        // Convert base64 to binary
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return new Blob([bytes], { type: mimeType });
    }

    displayImageInConsole(imageId, dataUrl, size, mimeType) {
        try {
            // Create img element with base64 data URL
            const img = document.createElement('img');
            img.src = dataUrl;
            img.style.maxWidth = '200px';
            img.style.maxHeight = '200px';
            img.style.border = '2px solid #333';
            img.style.borderRadius = '4px';

            // Create clickable link element
            const link = document.createElement('a');
            link.href = dataUrl;
            link.target = '_blank';
            link.textContent = `🔗 Click to open ${imageId} in new tab`;
            link.style.color = '#4285f4';
            link.style.textDecoration = 'underline';

            // Method 1: Console image preview using CSS background
            // console.log(`%c🖼️ ${imageId} Preview`,
            //     `background-image: url(${dataUrl}); 
            //      background-size: contain; 
            //      background-repeat: no-repeat; 
            //      background-position: center;
            //      padding: 100px 150px; 
            //      border: 2px solid #333; 
            //      border-radius: 8px;
            //      color: white; 
            //      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            //      font-weight: bold;
            //      margin: 10px;`);

            // Method 2: Log the image element (expandable in DevTools)
            // console.log(`🖼️ Image ${imageId} (expandable):`, img);

            // Method 3: Console group with all options
            console.group(`🖼️ ${imageId} - All Display Options`);
            // //console.log('🎨 CSS Background Preview:', `%c${imageId}`,
            //     `background: url(${dataUrl}) no-repeat center; background-size: 100px 100px; padding: 50px; border: 1px solid #ccc;`);
            console.groupEnd();

            // Method 4: Try to create a canvas preview
            this.createCanvasPreview(imageId, dataUrl);

        } catch (e) {
            // console.log(`⚠️ Console image display failed: ${e.message}`);
            // console.log(`Direct data URL: ${dataUrl}`);
        }
    }

    createCanvasPreview(imageId, dataUrl) {
        try {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Set canvas size (thumbnail)
                const maxSize = 150;
                const ratio = Math.min(maxSize / img.width, maxSize / img.height);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;

                // Draw image to canvas
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Log canvas to console
          //      console.log(`🎨 Canvas preview for ${imageId} (${canvas.width}x${canvas.height}):`, canvas);

                // Also try to get canvas as data URL for additional preview
                const canvasDataUrl = canvas.toDataURL();
                // console.log(`%c🎨 Canvas as CSS background`,
                //     `background: url(${canvasDataUrl}) no-repeat center; 
                //      background-size: contain; 
                //      padding: 75px; 
                //      border: 1px solid #666;`);
            };
            img.src = dataUrl;
        } catch (e) {
            // console.log(`Canvas preview failed for ${imageId}:`, e.message);
        }
    }
}

class PhotoExtractor {
    constructor() {
        this.isPaused = false;   
        this.resumeFromPause = false;
        this.frontendSessionManager = new FrontendSessionManager();
        this.photos = [];
        this.videos = []; // Track videos found during extraction
        this.videosFound = 0; // Track videos found during extraction
        this.isProcessing = false;
        this.scrollAttempts = 0;
        this.maxScrollAttempts = 10;
        this.scrollDelay = 300; // 300ms between scrolls - much faster
        this.isInitialized = false;
        this.isScanning = false;
        this.isFullWorkflow = false; // Flag to indicate full workflow vs standalone scan
        this.scanComplete = false; // Flag to indicate scan is complete and results should not be overwritten
        this.panelOpen = false;
        this.observer = null;
        this.lastScreenshotTime = 0; // Track last screenshot for rate limiting
        this.faceApiLoaded = false;
        this.modelsLoaded = false;
        this.isPaidVersion = false; // Will be loaded from storage
        // NEW: Daily limits for non-pro users
        this.dailySimilarGroupsLimit = 2; // Max 2 similar groups per day for free version
        this.dailyReAnalysisLimit = 10; // Max 10 re-analysis per day for free version
        this.todaySimilarGroupsShown = 0; // Similar groups shown today
        this.todayReAnalysisCount = 0; // Re-analysis count today
        this.groupsAlreadyCounted = false; // Flag to prevent double-counting groups
        this.imageSizeCache = {}; // Cache for image sizes to avoid repeated requests
        this.authDataCache = null; // Cache for DupeYak Duplicate Remover authentication data
        this.viewportObserver = null; // Intersection Observer for viewport detection
        this.viewportTimers = new Map(); // Timers for tracking how long images are in viewport
        this.imageSizeLoaders = new Map(); // Track ongoing size loading operations
        this.photoScrollPositions = new Map(); // NEW: Track scroll positions where photos were found
        this.metadataSelectionInProgress = false; // Track if metadata selection is currently running

        this.init();
    }

    // Disable all metadata buttons during selection
    disableAllMetadataButtons() {
        const buttons = $('.pc-btn-metadata, .pc-btn-group-metadata, .pc-btn-group-ai');
        buttons.forEach(button => {
            if (!button.disabled) {
                button.dataset.wasEnabled = 'true';
                button.disabled = true;
                button.style.opacity = '0.5';
            }
        });
    }

    // Re-enable metadata buttons after selection
    enableAllMetadataButtons() {
        const buttons = $('.pc-btn-metadata, .pc-btn-group-metadata, .pc-btn-group-ai');
        buttons.forEach(button => {
            if (button.dataset.wasEnabled === 'true') {
                button.disabled = false;
                button.style.opacity = '';
                delete button.dataset.wasEnabled;
            }
        });
    }

    // Load metadata for photos concurrently in batches
    async loadMetadataConcurrently(imageItems, updateCallback, batchSize = 10) {
        const photosWithMetadata = [];
        let processedPhotos = 0;
        const totalPhotos = imageItems.length;

        // Process photos in batches
        for (let i = 0; i < imageItems.length; i += batchSize) {
            const batch = imageItems.slice(i, i + batchSize);

            // Create promises for this batch
            const batchPromises = batch.map(async (imageItem) => {
                const photoId = imageItem.getAttribute('data-photo-id');
                const mediaType = imageItem.getAttribute('data-media-type') || 'photo';

                // Look in appropriate array based on media type
                const mediaItem = mediaType === 'video'
                    ? this.videos.find(v => v.id === photoId)
                    : this.photos.find(p => p.id === photoId);

                if (mediaItem) {
                    try {
                        const metadata = await this.getOriginalImageSize(mediaItem);
                        return {
                            imageItem,
                            photoId,
                            metadata: metadata || {},
                            mediaType
                        };
                    } catch (error) {
                        console.warn(`⚠️ Failed to get metadata for ${mediaType} ${photoId}:`, error);
                        return {
                            imageItem,
                            photoId,
                            metadata: {},
                            mediaType
                        };
                    }
                }
                return null;
            });

            // Wait for this batch to complete
            const batchResults = await Promise.all(batchPromises);

            // Add valid results to our collection
            batchResults.forEach(result => {
                if (result) {
                    photosWithMetadata.push(result);
                    processedPhotos++;

                    // Update progress callback
                    if (updateCallback) {
                        updateCallback(processedPhotos, totalPhotos);
                    }

                    console.log(`📊 Got metadata for photo ${result.photoId}:`, result.metadata);
                }
            });

            // Small delay between batches to avoid overwhelming the API
            if (i + batchSize < imageItems.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }

        return photosWithMetadata;
    }

    async init() {
        // Always show full panel immediately
        // //console.log('🚀 Initializing full panel...');
        await this.loadPaidStatus();
        this.initializeFaceDetection();
        this.initializeFullPanel();

        // Update UI to reflect current status
        this.updateUIForCurrentStatus();

        // Listen for storage changes to sync daily count across windows
        this.setupStorageListener();
    }

    async loadPaidStatus() {
        try {
            // Check local storage for cached status
            const result = await chrome.storage.local.get(['isPaidVersion', 'dailySimilarGroupsShown', 'dailyReAnalysisCount', 'lastActivityDate']);
            this.isPaidVersion = result.isPaidVersion || false;

            // Load daily limits for free version
            if (!this.isPaidVersion) {
                await this.loadDailyLimits();
            }

            // //console.log('💰 Paid status loaded:', this.isPaidVersion ? 'PAID' : 'FREE');
            if (!this.isPaidVersion) {
                // //console.log('📊 Daily limits - Similar groups:', this.todaySimilarGroupsShown, '/', this.dailySimilarGroupsLimit, ', Re-analysis:', this.todayReAnalysisCount, '/', this.dailyReAnalysisLimit);
            }

            // Update UI after loading status
            setTimeout(() => this.updateUIForCurrentStatus(), 100);
        } catch (error) {
            console.warn('⚠️ Failed to load paid status:', error);
            this.isPaidVersion = false;
        }
    }

    async loadDailyLimits() {
        try {
            const today = new Date().toDateString();
            const result = await chrome.storage.local.get(['dailySimilarGroupsShown', 'dailyReAnalysisCount', 'lastActivityDate']);

            // Reset counts if it's a new day
            if (result.lastActivityDate !== today) {
                this.todaySimilarGroupsShown = 0;
                this.todayReAnalysisCount = 0;
                await chrome.storage.local.set({
                    dailySimilarGroupsShown: 0,
                    dailyReAnalysisCount: 0,
                    lastActivityDate: today
                });
            } else {
                this.todaySimilarGroupsShown = result.dailySimilarGroupsShown || 0;
                this.todayReAnalysisCount = result.dailyReAnalysisCount || 0;
            }
        } catch (error) {
            console.warn('⚠️ Failed to load daily limits:', error);
            this.todaySimilarGroupsShown = 0;
            this.todayReAnalysisCount = 0;
        }
    }

    async updateDailySimilarGroupsCount(newGroupsShown) {
        if (this.isPaidVersion) return; // No limits for paid version

        try {
            const today = new Date().toDateString();

            // Add new groups to existing count
            this.todaySimilarGroupsShown += newGroupsShown;

            await chrome.storage.local.set({
                dailySimilarGroupsShown: this.todaySimilarGroupsShown,
                lastActivityDate: today
            });

           // //console.log('📊 Updated daily similar groups count: +', newGroupsShown, 'new groups, total:', this.todaySimilarGroupsShown, '/', this.dailySimilarGroupsLimit);
        } catch (error) {
          //  console.warn('⚠️ Failed to update daily similar groups count:', error);
        }
    }

    async updateDailyReAnalysisCount() {
        if (this.isPaidVersion) return; // No limits for paid version

        try {
            const today = new Date().toDateString();

            // Increment re-analysis count
            this.todayReAnalysisCount += 1;

            await chrome.storage.local.set({
                dailyReAnalysisCount: this.todayReAnalysisCount,
                lastActivityDate: today
            });

          //  //console.log('📊 Updated daily re-analysis count:', this.todayReAnalysisCount, '/', this.dailyReAnalysisLimit);
        } catch (error) {
          //  console.warn('⚠️ Failed to update daily re-analysis count:', error);
        }
    }

    canShowMoreSimilarGroups() {
        if (this.isPaidVersion) return true; // No limits for paid version
        return this.todaySimilarGroupsShown < this.dailySimilarGroupsLimit;
    }

    canPerformReAnalysis() {
        if (this.isPaidVersion) return true; // No limits for paid version
        return this.todayReAnalysisCount < this.dailyReAnalysisLimit;
    }

    getRemainingGroupsToday() {
        if (this.isPaidVersion) return Infinity; // No limits for paid version
        return Math.max(0, this.dailySimilarGroupsLimit - this.todaySimilarGroupsShown);
    }

    getRemainingReAnalysisToday() {
        if (this.isPaidVersion) return Infinity; // No limits for paid version
        return Math.max(0, this.dailyReAnalysisLimit - this.todayReAnalysisCount);
    }

    async setPaidStatus(isPaid) {
        try {
            this.isPaidVersion = isPaid;
            await chrome.storage.local.set({ isPaidVersion: isPaid });

            // If upgrading to paid, reset daily limits
            if (isPaid) {
                await chrome.storage.local.remove(['dailySimilarGroupsShown', 'dailyReAnalysisCount', 'lastActivityDate']);
                this.todaySimilarGroupsShown = 0;
                this.todayReAnalysisCount = 0;
            //    //console.log('✅ Upgraded to Pro - removed all daily limits');
            }

         //   //console.log('💰 Paid status updated:', isPaid ? 'PAID' : 'FREE');

            // Update UI immediately without full panel refresh
            this.updateUIForCurrentStatus();
        } catch (error) {
          //  console.error('❌ Failed to save paid status:', error);
        }
    }

	//convert to jquery
    refreshPanel() {
        // Remove existing panel and recreate it
        const existingPanel = $('#photo-cleaner-panel');
        if (existingPanel.length) {
            existingPanel.remove();
        }
        this.initializeFullPanel();
        this.updateUIForCurrentStatus();
    }

    updateUIForCurrentStatus() {
        // Update version badge and buy button
        this.updateVersionDisplay();

        // Update daily limits display
        if (!this.isPaidVersion) {
            this.updateDailyLimitsDisplay();
        }
    }

	//convert to jquery
    updateVersionDisplay() {
        const versionBadge = $('.pc-version-badge');
        const buyButton =  $('#pc-buy');

        if (versionBadge.length) {
            if (this.isPaidVersion) {
                versionBadge.attr('class', 'pc-version-badge pc-paid').text('💎 PRO');
            } else {
                versionBadge.attr('class', 'pc-version-badge pc-free').text('🆓 FREE');
            }
        }

        if (buyButton.length) {
            if (this.isPaidVersion) {
                buyButton.style.display = 'none';
            } else {
                buyButton.style.display = 'block';
            }
        }
    }

    updateDailyLimitsDisplay() {
        if (this.isPaidVersion) return;

        const versionBadge = document.querySelector('.pc-version-badge.pc-free');
        if (versionBadge) {
            versionBadge.textContent = `2 groups | Re-analysis: ${this.todayReAnalysisCount}/${this.dailyReAnalysisLimit}`;
        }
    }

    async openPurchasePopup() {
      //  //console.log('🛒 Opening extension popup for purchase...');

        // Check if we're in a scanning window (has scan parameters)
        const urlParams = new URLSearchParams(window.location.search);
        const isInScanningWindow = urlParams.has('pc_scan_start');

        if (isInScanningWindow) {
            // We're in a scanning window - offer to return to original window
            this.showReturnToOriginalWindowMessage();
            return;
        }

        // Send message to background script to open extension page
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'openExtensionPage'
            });

            if (response && response.success) {
             //   //console.log('✅ Extension page opened for purchase');
            } else {
                console.warn('⚠️ Could not open extension page:', response?.error);
                // Fallback: show inline message
                this.showInlinePurchaseMessage();
            }
        } catch (error) {
          //  console.error('❌ Failed to send message to background script:', error);
            // Fallback: show inline message
            this.showInlinePurchaseMessage();
        }
    }

    showInlinePurchaseMessage() {
        // Fallback method to show purchase info if popup fails
        const message = `
🔥 Upgrade to Pro Version! 🔥

✨ AI-powered smart photo selection
🎯 Advanced similarity detection  
⚡ Unlimited photo processing
🔧 Priority support

Price: €9.99 (one-time payment)

Would you like to open the extension page to purchase Pro now?
        `.trim();

        const shouldOpenExtension = confirm(message + '\n\nClick OK to open extension page, or Cancel to continue.');

        if (shouldOpenExtension) {
         //   //console.log('🛒 User chose to open extension page for purchase');
            this.openExtensionPage();
        } else {
          //  //console.log('ℹ️ User chose to continue without purchasing');
        }
    }

    showReturnToOriginalWindowMessage() {
        // Show message when trying to buy from scanning window
        const message = `
🛒 Purchase Pro Version

You're currently in a scanning window. To purchase the Pro version:

1. Click "Open Extension Page" below
2. Complete your purchase in the extension page

The extension page will open in a new tab and this scanning window will close.
        `.trim();

        const shouldProceed = confirm(message + '\n\nClick OK to open extension page, or Cancel to continue scanning.');

        if (shouldProceed) {
         //   //console.log('🔄 User chose to open extension page for purchase');
            this.openExtensionPageAndClose();
        } else {
         //   //console.log('ℹ️ User chose to continue scanning');
        }
    }

    returnToOriginalWindow() {
        // Close current scanning window and return to original
      //  //console.log('🔄 Returning to original window...');

        // Create a clean URL without scan parameters for the original window
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete('pc_scan_start');
        currentUrl.searchParams.delete('pc_full_workflow');
        currentUrl.searchParams.delete('pc_similarity');

        const originalUrl = currentUrl.toString();

        // Try to open the original window
        const originalWindow = window.open(originalUrl, '_blank');

        if (originalWindow) {
      //      //console.log('✅ Original window opened, closing scanning window...');
            // Close current scanning window after a brief delay
            setTimeout(() => {
                window.close();
            }, 1000);
        } else {
        //    console.error('❌ Failed to open original window (popup blocked?)');
            alert('Failed to open original window. Please manually navigate to DupeYak Duplicate Remover in another tab to purchase.');
        }
    }

    async openExtensionPageAndClose() {
        // Open extension page and close current scanning window
      //  //console.log('🛒 Opening extension page for purchase and closing scanning window...');

        try {
            // Send message to background script to open extension page
            const response = await chrome.runtime.sendMessage({
                action: 'openExtensionPage'
            });

            if (response && response.success) {
            //    //console.log('✅ Extension page opened successfully, closing scanning window...');
                // Close current scanning window after a brief delay to ensure extension page loads
                setTimeout(() => {
                    window.close();
                }, 1000);
            } else {
              //  console.error('❌ Failed to open extension page:', response?.error);
                alert('Failed to open extension page. Please manually open the extension from your browser toolbar to purchase.');
            }
        } catch (error) {
        //    console.error('❌ Error opening extension page:', error);
            alert('Failed to open extension page. Please manually open the extension from your browser toolbar to purchase.');
        }
    }

    async openExtensionPage() {
        // Open extension page without closing current window
       // //console.log('🛒 Opening extension page for purchase...');

        try {
            // Send message to background script to open extension page
            const response = await chrome.runtime.sendMessage({
                action: 'openExtensionPage'
            });

            if (response && response.success) {
             //   //console.log('✅ Extension page opened successfully');
            } else {
              //  console.error('❌ Failed to open extension page:', response?.error);
                alert('Failed to open extension page. Please manually open the extension from your browser toolbar to purchase.');
            }
        } catch (error) {
          //  console.error('❌ Error opening extension page:', error);
            alert('Failed to open extension page. Please manually open the extension from your browser toolbar to purchase.');
        }
    }

    // Temporary method for testing - remove in production
    async testPurchase() {
      //  //console.log('🧪 Testing purchase flow...');
        await this.setPaidStatus(true);
        // //console.log('✅ Test purchase completed');
    }

    // Debug method to clear pro status
    async clearProStatus() {
        // //console.log('🧹 Clearing pro status for debugging...');
        await this.setPaidStatus(false);
        // //console.log('✅ Pro status cleared - now showing FREE version');
    }

    // Debug method to show current status
    showDebugStatus() {
        // //console.log('🔍 Current extension status:');
        // //console.log('   isPaidVersion:', this.isPaidVersion);
        // //console.log('   todaySimilarGroupsShown:', this.todaySimilarGroupsShown);
        // //console.log('   dailySimilarGroupsLimit:', this.dailySimilarGroupsLimit);
        // //console.log('   todayReAnalysisCount:', this.todayReAnalysisCount);
        // //console.log('   dailyReAnalysisLimit:', this.dailyReAnalysisLimit);
        // //console.log('   canShowMoreSimilarGroups:', this.canShowMoreSimilarGroups());
        // //console.log('   canPerformReAnalysis:', this.canPerformReAnalysis());
        // //console.log('   remainingGroupsToday:', this.getRemainingGroupsToday());
        // //console.log('   remainingReAnalysisToday:', this.getRemainingReAnalysisToday());
        // //console.log('');
        // //console.log('🛠️ Debug commands:');
        // //console.log('   To clear pro status: window.photoCleanerInstance.clearProStatus()');
        // //console.log('   To set pro status: window.photoCleanerInstance.testPurchase()');
        // //console.log('   To reset daily limits: window.photoCleanerInstance.resetDailyLimits()');
        // //console.log('   To set group count: window.photoCleanerInstance.setGroupCount(X)');
        // //console.log('   To set re-analysis count: window.photoCleanerInstance.setReAnalysisCount(X)');
    }

    async resetDailyLimits() {
    //    //console.log('🔄 Resetting daily limits for debugging...');
        try {
            this.todaySimilarGroupsShown = 0;
            this.todayReAnalysisCount = 0;
            await chrome.storage.local.remove(['dailySimilarGroupsShown', 'dailyReAnalysisCount', 'lastActivityDate']);
            this.updateDailyLimitsDisplay();
        //    //console.log('✅ Daily limits reset - Groups:', this.dailySimilarGroupsLimit, ', Re-analysis:', this.dailyReAnalysisLimit);
        } catch (error) {
          //  console.error('❌ Failed to reset daily limits:', error);
        }
    }

    async setGroupCount(count) {
        console.log(`🔧 Setting daily group count to ${count} for debugging...`);
        try {
            const today = new Date().toDateString();
            this.todaySimilarGroupsShown = count;
            await chrome.storage.local.set({
                dailySimilarGroupsShown: count,
                lastActivityDate: today
            });
            this.updateDailyLimitsDisplay();
            // //console.log('✅ Group count set to:', count, '/', this.dailySimilarGroupsLimit);
            // //console.log('   Can show more groups:', this.canShowMoreSimilarGroups());
            // //console.log('   Remaining groups today:', this.getRemainingGroupsToday());
        } catch (error) {
           // console.error('❌ Failed to set group count:', error);
        }
    }

    async setReAnalysisCount(count) {
        console.log(`🔧 Setting daily re-analysis count to ${count} for debugging...`);
        try {
            const today = new Date().toDateString();
            this.todayReAnalysisCount = count;
            await chrome.storage.local.set({
                dailyReAnalysisCount: count,
                lastActivityDate: today
            });
            this.updateDailyLimitsDisplay();
            // //console.log('✅ Re-analysis count set to:', count, '/', this.dailyReAnalysisLimit);
            // //console.log('   Can perform re-analysis:', this.canPerformReAnalysis());
            // //console.log('   Remaining re-analysis today:', this.getRemainingReAnalysisToday());
        } catch (error) {
            // console.error('❌ Failed to set re-analysis count:', error);
        }
    }

    setupStorageListener() {
        // Listen for changes to daily limits and paid status across all windows
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local') {
                let shouldUpdateUI = false;

                // Handle daily similar groups count changes
                if (changes.dailySimilarGroupsShown) {
                    const newCount = changes.dailySimilarGroupsShown.newValue;
                    if (newCount !== undefined && newCount !== this.todaySimilarGroupsShown) {
                     //   //console.log('🔄 Daily similar groups count updated from another window:', this.todaySimilarGroupsShown, '→', newCount);
                        this.todaySimilarGroupsShown = newCount;
                        shouldUpdateUI = true;
                    }
                }

                // Handle daily re-analysis count changes
                if (changes.dailyReAnalysisCount) {
                    const newCount = changes.dailyReAnalysisCount.newValue;
                    if (newCount !== undefined && newCount !== this.todayReAnalysisCount) {
                     //   //console.log('🔄 Daily re-analysis count updated from another window:', this.todayReAnalysisCount, '→', newCount);
                        this.todayReAnalysisCount = newCount;
                        shouldUpdateUI = true;
                    }
                }

                // Handle paid status changes
                if (changes.isPaidVersion) {
                    const newPaidStatus = changes.isPaidVersion.newValue;
                    if (newPaidStatus !== undefined && newPaidStatus !== this.isPaidVersion) {
                   //     //console.log('💰 Paid status updated from another window:', this.isPaidVersion, '→', newPaidStatus);
                        this.isPaidVersion = newPaidStatus;

                        // If upgraded to paid, reset daily limits
                        if (newPaidStatus) {
                            this.todaySimilarGroupsShown = 0;
                            this.todayReAnalysisCount = 0;
                        }
                        shouldUpdateUI = true;
                    }
                }

                // Update UI if any relevant changes occurred
                if (shouldUpdateUI) {
                 //   //console.log('🔄 Updating UI due to storage changes from another window');
                    this.updateUIForCurrentStatus();
                }
            }
        });

    //    //console.log('👂 Storage listener setup complete - will sync changes across windows');
    }





    async initializeFaceDetection() {
        try {
        //    //console.log('🤖 Initializing face detection models...');

            // Wait for face-api.js to be available
            if (typeof faceapi === 'undefined') {
                // //console.log('⏳ Waiting for face-api.js to load...');
                await this.waitForFaceApi();
            }

            // Load models
            const modelPath = chrome.runtime.getURL('models');
            // //console.log('📁 Loading models from:', modelPath);

            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
                faceapi.nets.faceExpressionNet.loadFromUri(modelPath)
            ]);

            this.modelsLoaded = true;
            // //console.log('✅ Face detection models loaded successfully');

        } catch (error) {
            // console.warn('⚠️ Failed to load face detection models:', error);
            this.modelsLoaded = false;
        }
    }

    async waitForFaceApi() {
        return new Promise((resolve) => {
            const checkFaceApi = () => {
                if (typeof faceapi !== 'undefined') {
                    this.faceApiLoaded = true;
                    resolve();
                } else {
                    setTimeout(checkFaceApi, 100);
                }
            };
            checkFaceApi();
        });
    }


//convert to jquery
    initializeFullPanel() {
        // Don't initialize if already exists
         if ($('#photo-cleaner-panel').length) {
            return;
        }

        // Remove the minimal button
        const triggerButton =$('#photo-cleaner-trigger');
        if (triggerButton.length) {
            triggerButton.remove();
        }

        // Check viewport size first
        const viewportCheck = this.checkViewportSize();
        if (!viewportCheck.adequate) {
            this.showViewportResizeMessage(viewportCheck);
            return;
        }

        // const statusElement = $('<div class="">', { id: 'pc-floating-status',style: 'display:none;' }).html(`
        // <div id="pc-floating-status pc-floating-status" class="g-btn absolute ">
        // <span id="pc-photo-count">Idle</span>
        //  <span id="pc-progress-text" style="display:none;">Preparing to analyze 0/0</span>
        // </div>
        // `);

        const newMagnifierIconUrl = chrome.runtime.getURL('../icons/magnifier.svg');
        const statusElement = $('<div>', { id: 'pc-floating-status',class:"pc-floating-Main",style: 'display:none;' }).html(`
        <div id="pc-floating-status" class=" g-btn absolute left-[20px] top-[20px] left-[50%] -translate-x-[50%] !w-[97%] bg-gradient p-4 rounded-[20px]">
        <span id="pc-photo-count">Idle</span>
         <span id="pc-progress-text" style="display:none;">Preparing to analyze 0/0</span>
        </div>
        `);
        statusElement.find('.new-Magnifier').attr('src', newMagnifierIconUrl);
    // const statusElement = $('<div class="!left-0 !w-[100%]">', { id: 'pc-floating-status',style: 'display:none;' }).html(`
    //     <div id="pc-floating-status class="g-btn absolute left-[50%] -translate-x-[50%] top-[20px] !w-[97%]">
    //     <span id="pc-photo-count">Idle</span>
    //      <span id="pc-progress-text" style="display:none;" class="!flex">
    //         <span class="rounded-[10px] new-Magnifier flex w-[40px] max-[767px]:w-[45px] items-center justify-center" src="chrome-extension://flcmckdkmfkfebllbphddhghjkmoijfl/icons/magnifier.svg"><img class="new-Magnifier" src="chrome-extension://flcmckdkmfkfebllbphddhghjkmoijfl/icons/magnifier.svg" alt="logo" data-iml="30530"><span>Analyzing 42 of 100 photos...</span></span>
    //      Preparing to analyze 0/0</span>
    //     </div>
    //     `);
        // const premiumIconUrl = chrome.runtime.getURL('../icons/icon/premium.svg');
        const playIconUrl = chrome.runtime.getURL('../icons/play-icon.svg');
        const paushIconUrl = chrome.runtime.getURL('../icons/pause-icon.svg');
  const panel = $(`
<div id="photo-cleaner-panel" class="analysis-pesults-popup fixed !top-0 !right-0 w-full h-full">
    <div class="relative w-full">
          <div class="popup-wrapper">
        <!-- Close / back button -->
        <div id="Intial_PopUp_button" class="g-btn absolute left-[20px] top-[20px]">
            <a href="#" class="whitespace-nowrap background-one text-white py-[6px] px-[16px] inline-flex rounded-full font-medium gap-1 items-center">
                <i class="fa-solid fa-angle-left"></i> Click scan to start
            </a>
        </div>

        <!-- Main popup box -->
        <div id="Intial_PopUp" class="dark-background rounded-[20px] p-4 relative w-[400px] absolute right-[20px] top-[20px] ml-auto border-color-two border shadow-[4px_4px_8px_#f5f8ff]">
            
            <div class="mb-2" id="pc-version-wrap">
                <!-- Version badge and button -->
            </div>

            <!-- Buttons row -->
            <div class="flex justify-center gap-3 mb-3">
                <button id="pc-scan" class="play_paush_btn relative text-[12px] whitespace-nowrap background-one text-white py-[6px] px-[16px] inline-flex rounded-full font-medium gap-1 items-center">
                    <span class="w-[12px] h-[13px] relative">
                        <img class="play-img absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full object-cover" src="chrome-extension://flcmckdkmfkfebllbphddhghjkmoijfl/icons/icon/premium.svg">
                        <img class="paush-img absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full object-cover opacity-[0]" src="chrome-extension://flcmckdkmfkfebllbphddhghjkmoijfl/icons/icon/premium.svg">
                    </span>    
                    <span class="btn-label">Scan for Duplicates</span>
                </button>

                <button class="text-[12px] whitespace-nowrap background-one text-white py-[6px] px-[15px] inline-flex rounded-full font-medium gap-1 items-center">
                    Re-analyze
                </button>
            </div>

            <!-- Slider row -->
            <div class="flex flex-col items-center text-center">
                <label class="text-white text-[13px] font-semibold mb-1">Analysis Settings</label>
                <label class="text-white text-[12px] font-normal mb-2">
                    Similarity Threshold: <span id="pc-similarity">75</span>%
                </label>
                <input type="range" id="pc-similarity-label" 
                    class="w-[70%] accent-blue-500" 
                    min="0.1" max="1.0" value="0.75" step="0.01">
            </div>
        </div>
        </div>
    </div>
</div>
`);


            const versionHtml = this.isPaidVersion
                ? `
                    <a href="#" class="flex items-center gap-2 dark-color font-semibold">
                    <span class="w-[30px] pl-2 premium-icon">
                        <img alt="">
                    </span> 💎 PRO
                    </a>
                `
                : `
                    <div class="flex items-center justify-between gap-4">
                    <a href="#" class="flex items-center gap-1 text-white font-semibold">
                        <span class="w-[30px] pl-2 premium-icon">
                        <img alt="">
                        </span> 
                    </a>
                    <a href="#" id="pc-close" class="font-semibold w-[30px] h-[30px] !rounded-full !bg-white flex justify-center items-center">
                        <i class="fa-solid fa-xmark text-white"></i>
                    </a>
                    
                    </div>
                `;

            panel.find('#pc-version-wrap').html(versionHtml);
            // panel.find('.premium-img').attr('src', premiumIconUrl);
            panel.find('.play-img').attr('src', playIconUrl);
            panel.find('.paush-img').attr('src', paushIconUrl);
        // Create screenshot area separately and append to body (not inside panel)
        const screenshotArea = $('<div>', {
        id: 'pc-screenshot-area',
        class: 'pc-screenshot-area',
        style: 'display:none;'
    }).html(`
        <div id="pc-screenshot-container" class="pc-screenshot-container">
            <!-- Screenshot slots will be added dynamically -->
        </div>
    `);

     $('body').append(statusElement, panel, screenshotArea);
    const thresholdSlider = $('#pc-similarity-label');
    const thresholdValue = $('#pc-similarity');
    if (thresholdSlider.length && thresholdValue.length) {
    thresholdSlider.on('input', (e) => {
        const percentage = Math.round(parseFloat(e.target.value) * 100);
        thresholdValue.text(percentage );
    });
    }

        // Add event listeners
    $('#pc-close').on('click', () => {
            this.closePanel();
        });

    // $('#pc-scan').on('click', () => {
  $(document)
  .off('click', '#pc-scan') // Purana event remove
  .on('click', '#pc-scan', async () => {

    const userData = await getUserData();
    if (!userData.userEmail || !userData.userId) {
        
        chrome.runtime.sendMessage({
            action: 'openExtensionPage',
        }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error('Batch screenshot failed: ' + chrome.runtime.lastError.message));
                return;
            }
        });
        return;
    }

    if (!this.isProcessing) {
        this.isPaused = false;
        this.resumeFromPause = false;
        this.startFullWorkflow();
        this.togglePlayPauseUI(true); 
    } else {
        if (this.isPaused) {
            this.isPaused = false;
            this.resumeFromPause = true;
            this.togglePlayPauseUI(true); 
        } else {
            // Pause scanning
            this.isPaused = true;
            this.togglePlayPauseUI(false); 
        }
    }
});


        // Add buy button listener
         $('#pc-buy').on('click', () => {
        this.openPurchasePopup();
    });


    
        // Don't setup observer here - it will be activated only during scanning
        this.isInitialized = true;

        // Check if we should auto-start scanning (including after page reload)
        const urlParams = new URLSearchParams(window.location.search);
        const shouldAutoStart = urlParams.has('pc_scan_start');

        // //console.log('🔍 initializeFullPanel - Checking for auto-start condition:');
        // //console.log('   URL search params:', window.location.search);
        // //console.log('   URLSearchParams object:', urlParams.toString());
        // //console.log('   Has pc_scan_start:', urlParams.has('pc_scan_start'));
        // //console.log('   pc_scan_start value:', urlParams.get('pc_scan_start'));
        // //console.log('   shouldAutoStart:', shouldAutoStart);
        // //console.log('   Document ready state:', document.readyState);
        // //console.log('   Window loaded:', document.readyState === 'complete');

        if (shouldAutoStart) {
            // Check if this is a full workflow restart
            const isFullWorkflow = urlParams.has('pc_full_workflow');
            const similarityThreshold = urlParams.get('pc_similarity') || 85;

            // //console.log('🎯 Auto-start conditions met:');
            // //console.log('   isFullWorkflow:', isFullWorkflow);
            // //console.log('   similarityThreshold:', similarityThreshold);

            // Set similarity threshold in UI
           const similarityInput  = $('#pc-similarity');  //Already change
        if (similarityInput .length) {
            similarityInput .text(similarityThreshold);
            // //console.log('✅ Set similarity threshold in UI:', similarityThreshold);
        } else {
            // //console.log('⚠️ Could not find similarity input element');
        }

            if (isFullWorkflow) {
                // This is after a page reload for full workflow - continue with full workflow
             //   //console.log('🔄 Page reloaded with full workflow parameter, auto-restarting full workflow...');
                setTimeout(() => {
                    // //console.log('🚀 Executing auto-start full workflow now...');
                    // //console.log('   this.isProcessing:', this.isProcessing);
                    // //console.log('   this.isScanning:', this.isScanning);
                    this.startFullWorkflow();
                }, 1000); // Give page a moment to fully load
            } else {
                // This is after a page reload for scanning only - start scanning
                // //console.log('🔄 Page reloaded with scan parameter, auto-restarting scan...');
                setTimeout(() => {
                    // //console.log('🚀 Executing auto-start scanning now...');
                    // //console.log('   this.isProcessing:', this.isProcessing);
                    // //console.log('   this.isScanning:', this.isScanning);
                    this.startScanning();
                }, 1000); // Give page a moment to fully load
            }
        } else {
           // //console.log('ℹ️ No auto-start parameters found, waiting for manual trigger');
        }
    // $(document).on('click', '#pc-scan', () => {
    // if (!this.isProcessing) {
    //     this.isPaused = false;
    //     this.resumeFromPause = false;
    //     this.startFullWorkflow();
    //     this.togglePlayPauseUI(true); 
    // } else {
    //     if (this.isPaused) {
    //         this.isPaused = false;
    //         this.resumeFromPause = true;
    //         this.togglePlayPauseUI(true); 
    //     } else {
    //         // Pause scanning
    //         this.isPaused = true;
    //         this.togglePlayPauseUI(false); 
    //     }
    // }
    // });

    }
    togglePlayPauseUI(isPlaying) {
    const playImg = $('.play-img');
    const pauseImg = $('.paush-img');

    if (isPlaying) {
        playImg.css('opacity', '0');
        pauseImg.css('opacity', '1');
    } else {
        playImg.css('opacity', '1');
        pauseImg.css('opacity', '0');
    }
    }

	//convert to jquery
    closePanel() {
        const panel = $('#photo-cleaner-panel');
        if (panel.length) {
            panel.remove();
        }

        const statusElement =  $('#pc-floating-status');
        if (statusElement.length) {
            statusElement.remove();
        }

        // Hide window warning if it's showing
        this.showWindowWarning(false);

        // Disconnect observer when closing panel
        this.disconnectObserver();

        // Reset state
        this.photos = [];
        this.isProcessing = false;
        this.isInitialized = false;
        this.scanComplete = false;
    }

  closeInitialPopup() {
        // const PopUp = $('#Intial_PopUp,#Intial_PopUp_button');
          const PopUp = $('.popup-wrapper');
        if (PopUp.length) {
            PopUp.remove();
        }
    }
     
    setupObserver() {
        // Setup observer to detect new photos being loaded during scanning
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new MutationObserver((mutations) => {
            // Only run during active scanning to detect new photos
            if (!this.isInitialized || !this.isScanning) return;

            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    // Throttle updates to avoid performance issues
                    clearTimeout(this.updateTimeout);
                    this.updateTimeout = setTimeout(() => {
                        this.updatePhotoCount();
                    }, 1000);
                }
            });
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    disconnectObserver() {
        // Disconnect observer when scanning is complete
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        // Clear any pending update timeout
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = null;
        }
    }

	//convert to jquery
    async startScanning() {
        if (this.isProcessing && !this.resumeFromPause) return;

        // Check if this is an auto-restart after page reload (GET parameter-based)
        const urlParams = new URLSearchParams(window.location.search);
        const isAutoRestart = urlParams.has('pc_scan_start');

        if (!this.resumeFromPause) {
        if (!isAutoRestart) {
            // This is a manual scan start - open new window to ensure clean DOM state for scanning
            // //console.log('🔄 Opening new window to ensure clean DOM state for scanning...');

            // Show user what's happening
            const scanBtn = $('#pc-scan');
            const photoCountElement = $('#pc-photo-count');

            if (scanBtn.length) {
               scanBtn.find('.btn-label').text('🔄 Opening new window...');
            }
            if (photoCountElement.length) {
                photoCountElement.html('Opening new window for clean scan...');
            }

            // Add GET parameter to trigger auto-restart in new window
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('pc_scan_start', '1');

            // If this is part of a full workflow, add that info too
            if (this.isFullWorkflow) {
                currentUrl.searchParams.set('pc_full_workflow', '1');
                currentUrl.searchParams.set('pc_similarity', this.similarityThreshold || 85);
            }

            // Open new window with GET parameter and window features to force actual window with max dimensions
            const screenWidth = window.screen.availWidth;
            const screenHeight = window.screen.availHeight;
            const newWindow = window.open(
                currentUrl.toString(),
                '_blank',
                `width=${screenWidth},height=${screenHeight},left=0,top=0,scrollbars=yes,resizable=yes,toolbar=yes,menubar=yes,location=yes`
            );

            if (newWindow) {
             //   //console.log('✅ New window opened successfully');

                // Reset button state in current window
                setTimeout(() => {
                    if (scanBtn.length) {
                        scanBtn.text('🔍 Scan for Duplicates').prop('disabled', false);
                    }
                    if (photoCountElement.length) {
                        // photoCountElement.html('Click scan to start');
                    }
                }, 1000);
                
            } else {
                console.error('❌ Failed to open new window (popup blocked?)');
                alert('Failed to open new window. Please allow popups for this site and try again.');

                // Reset button state
                if (scanBtn.length) {
                    scanBtn.text('🔍 Scan for Duplicates').prop('disabled', false);
                }
                if (photoCountElement.length) {
                    photoCountElement.html('Failed to open new window');
                }
            }

            return 'NEW_WINDOW_OPENED'; // Exit here, scanning will start in new window
        }

        }
        this.isProcessing = true;
        this.isScanning = true;
        this.resumeFromPause = false;
        // Clear the auto-restart GET parameter from URL
        this.cleanUrlAfterRestart();

        this.isProcessing = true;
        this.isScanning = true; // Set scanning flag
        this.showWindowWarning(true); // Show window warning during scanning
        this.scanComplete = false; // Reset scan complete flag when starting new scan
        this.scrollAttempts = 0;

        // Clear previous photos and results when starting a new scan
        this.clearPreviousResults();

        // Track initial photo count to calculate new photos in this scan session
        this.initialPhotoCount = this.photos.length;

        // Setup observer to detect new photos during scanning
        this.setupObserver();

        const scanBtn = $('#pc-scan');

       this.togglePlayPauseUI(true); // Play→Pause icon switch

       scanBtn.find('.btn-label').text('⏳ Scanning...');

        await this.scanWithScroll();

        // Disconnect observer since scanning is complete
        this.disconnectObserver();

        // Only reset button states if this was a standalone scan (not part of full workflow)
        // Full workflow will handle button states after analysis completes
        if (!this.isFullWorkflow) {
            scanBtn.find('.btn-label').text('🔍 Scan for Duplicates').parent().prop('disabled', false);
            this.isProcessing = false;
            this.isScanning = false; // Clear scanning flag
            this.showWindowWarning(false); // Hide window warning when scanning ends
        } else {
            // For full workflow, just clear scanning flag but keep processing state
            this.isScanning = false;
            this.showWindowWarning(false); // Hide window warning when scanning ends
        }

   //     console.log(`Scanning complete. Found ${this.photos.length} photos.`);
    }

    cleanUrlAfterRestart() {
        // URL parameters are kept intentionally for the new window
        // No cleanup needed as parameters help identify the scanning context
      //  //console.log('ℹ️ Keeping URL parameters in new window for context');
    }

	//convert to jquery
    clearPreviousResults() {
        // Clear photos array
        this.photos = [];

        // Clear videos array and reset video count
        this.videos = [];
        this.videosFound = 0;

        // Reset scan complete flag to allow normal updates
        this.scanComplete = false;

        // NEW: Clear scroll position data to start fresh
        this.photoScrollPositions.clear();
      //  //console.log('📍 Cleared scroll position data for fresh scan');

        // Clear any existing results overlay
        const existingOverlay = $('#pc-results-overlay');
        if (existingOverlay.length) {
            existingOverlay.remove();
        }

        // Clear storage
        chrome.storage.local.remove(['analysisResults', 'photos', 'timestamp']);

        // Reset photo count display only if not actively scanning
        if (!this.isScanning) {
            this.updatePhotoCount();
        }

        // Clear progress display only if not actively scanning
        if (!this.isScanning) {
            this.showProgress(false);
        }

        // Brief visual feedback
        const scanBtn = $('#pc-scan');
        if (scanBtn.length) {
            const originalText = scanBtn.find('.btn-label').text();
            scanBtn.find('.btn-label').text('🗑️ Clearing...');
            setTimeout(() => {
                if (scanBtn.textContent === '🗑️ Clearing...') {
                    scanBtn.textContent = originalText;
                }
            }, 500);
        }

    //    //console.log('🗑️ Cleared previous photos and results - starting fresh scan');
    }

    async scanWithScroll() {
        // //console.log('🔄 Starting simple scroll-based photo collection...');
        // console.log(`   Initial photos count: ${this.photos.length}`);
        // //console.log('📋 Logic: 1) Get photos → 2) Scroll 1 viewport → 3) Get photos → Repeat');
        // //console.log('🛑 Exit condition: No more scrolling available after 3 seconds wait');

        // Wait 2 seconds before starting to scroll to let the page fully load
        // //console.log('⏳ Waiting 2 seconds for page to fully load before starting scroll...');
        await this.delay(500);
        // //console.log('✅ Initial wait complete, starting photo collection...');

        // Initialize scroll tracking
        const scrollInfo = this.initializeScrollTracking();
        let totalScrolls = 0;
        let consecutiveCyclesWithoutProgress = 0;
        const MAX_CYCLES_WITHOUT_PROGRESS = 3;

        while (true) {
        if (this.isPaused) {
        // //console.log('⏸ Scanning paused...');
        await new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (!this.isPaused) {
                    clearInterval(checkInterval);
                    // //console.log('▶️ Resuming scan...');
                    resolve();
                }
            }, 100); // Har 0.5 sec check kare
        });
        }
            totalScrolls++;
            console.log(`\n🔄 === Scroll Cycle ${totalScrolls} ===`);

            // Step 1: Get photos
            const beforeCount = this.photos.length;
            console.log(`📊 Step 1: Getting photos - Current count: ${beforeCount}`);
            this.extractPhotos();
            const afterExtraction = this.photos.length;
            const newPhotosThisCycle = afterExtraction - beforeCount;
            console.log(`📊 Found ${newPhotosThisCycle} new photos. Total: ${afterExtraction}`);



            // Step 2: Check if we need to scroll back for incomplete backgrounds
            const needsBacktrack = await this.checkAndHandleIncompleteBackgrounds();
            if (needsBacktrack) {
                // //console.log('⏪ Backtracking was necessary - rechecking photos after backtrack...');
                this.extractPhotos(); // Re-extract after backtracking
            }

            // Step 3: Scroll 1 viewport forward
            // console.log(`📊 Step 3: Scrolling 1 viewport forward...`);
            const scrollResult = await this.performScroll();

            // Handle both object and boolean return values
            const scrolled = scrollResult && (scrollResult === true || scrollResult.scrolled === true);
            const scrollDelta = scrollResult && typeof scrollResult === 'object' ? scrollResult.scrollDelta : undefined;

            // console.log(`📊 Scroll result: ${scrolled ? 'SUCCESS' : 'FAILED'}`);
            if (scrollDelta !== undefined) {
                console.log(`📊 Scroll delta: ${scrollDelta}px`);
            }

            // Track progress to detect endless loops
            if (newPhotosThisCycle === 0) {
                consecutiveCyclesWithoutProgress++;
                console.log(`⚠️ No new photos found in cycle ${totalScrolls} (${consecutiveCyclesWithoutProgress}/${MAX_CYCLES_WITHOUT_PROGRESS} consecutive cycles without progress)`);

                // If we've had several cycles without finding new photos, check if we're just making minimal scroll progress
                if (consecutiveCyclesWithoutProgress >= MAX_CYCLES_WITHOUT_PROGRESS) {
                    // //console.log('🔍 Detecting potential endless loop - checking scroll progress...');

                    // If scroll result indicates minimal progress (very small delta), treat as end of content
                    if (scrollDelta !== undefined && scrollDelta < 2) { // Less than 2px scroll delta
                        console.log(`🛑 Minimal scroll progress detected (${scrollDelta}px) with no new photos. Treating as end of content.`);
                        break;
                    }

              //      //console.log('⏳ Multiple cycles without progress - waiting 3 seconds to confirm end of content...');
                    await this.delay(1000);

                    // Try one more scroll to confirm
                    const retryScrollResult = await this.performScroll();
                    const retryScrolled = retryScrollResult && (retryScrollResult === true || retryScrollResult.scrolled === true);
                    if (!retryScrolled) {
                //        //console.log('🛑 Confirmed: No more scrolling available after retry. Ending scan.');
                        break;
                    } else {
                  //      //console.log('✅ Scroll succeeded after wait - resetting progress counter...');
                        consecutiveCyclesWithoutProgress = 0; // Reset counter
                    }
                }
            } else {
                // Reset counter when we find new photos
                consecutiveCyclesWithoutProgress = 0;
            }

            // Exit condition: No more scrolling available
            if (!scrolled) {
         //       //console.log('⏳ Cannot scroll - waiting 3 seconds to confirm end of content...');
                await this.delay(3000);

                // Try one more time after waiting
                const retryScrollResult = await this.performScroll();
                const retryScrolled = retryScrollResult && (retryScrollResult === true || retryScrollResult.scrolled === true);
                if (!retryScrolled) {
             //       //console.log('🛑 Confirmed: No more scrolling available. Ending scan.');
                    break;
                } else {
               //     //console.log('✅ Scroll succeeded after wait - continuing...');
                    // If scroll succeeded, wait for photos to load
                //    //console.log('⏳ Waiting for photos to load after successful retry scroll...');
                    await this.waitForPhotosToLoad();
                }
            } else {
                // Step 4: Wait for photos to load after successful scroll
              //  console.log(`📊 Step 4: Waiting for photos to load...`);
                await this.waitForPhotosToLoad();
            }

            // Update progress display
            this.updateScanProgress(scrollInfo);

        //    console.log(`📊 End of cycle ${totalScrolls}: ${this.photos.length} total photos`);
        }

        // console.log(`\n🏁 Scrolling complete after ${totalScrolls} cycles`);
        // console.log(`📊 Final photo count: ${this.photos.length}`);
        // //console.log('🧹 Performing final cleanup...');

        // Show cleanup progress in UI
        const scanBtn = $('#pc-scan')
        const countElement = document.getElementById('pc-photo-count');

        if (scanBtn) {
            scanBtn.textContent = '🧹 Cleaning up...';
        }

        if (countElement) {
            countElement.innerHTML = '🧹 Performing final cleanup...';
            countElement.style.color = '#FF9800';
            countElement.style.fontStyle = 'italic';
        }

        await this.performFinalCleanup();

        // Restore button text
        if (scanBtn) {
            scanBtn.textContent = '🔍 Scan for Photos';
        }
    }



    async performFinalCleanup() {
        const beforeCleanup = this.photos.length;

        // Step 1: Final extraction pass to catch any missed photos
     //   //console.log('🔍 Final extraction pass to catch missed photos...');
        this.updateCleanupProgress('🔍 Finding missed photos...');

        // Wait a bit for any remaining photos to load
        await this.delay(2000);

        // Final extraction with thorough mode
        this.extractPhotos(true);

        const afterExtraction = this.photos.length;
        const newPhotosFound = afterExtraction - beforeCleanup;

        if (newPhotosFound > 0) {
            console.log(`✓ Found ${newPhotosFound} additional photos in final pass`);
        }

        // Step 2: Remove duplicates based on multiple criteria
    //    //console.log('🔄 Removing duplicates...');
        this.updateCleanupProgress('🔄 Removing duplicates...');

        const beforeDedup = this.photos.length;
        this.removeDuplicatePhotos();
        const afterDedup = this.photos.length;
        const duplicatesRemoved = beforeDedup - afterDedup;

        if (duplicatesRemoved > 0) {
            console.log(`✓ Removed ${duplicatesRemoved} duplicate photos`);
        }

        // Step 3: Final validation - remove duplicate photos
    //    //console.log('🧽 Removing duplicate photos...');
        this.updateCleanupProgress('🧽 Removing duplicates...');

        const beforeFinalDedup = this.photos.length;
        this.removeDuplicatePhotos();
        const afterFinalDedup = this.photos.length;
        const finalDuplicatesRemoved = beforeFinalDedup - afterFinalDedup;

        if (finalDuplicatesRemoved > 0) {
     //       console.log(`✓ Final cleanup: Removed ${finalDuplicatesRemoved} additional duplicate photos`);
        }



        // Final update - restore normal photo count display
        this.scanComplete = true; // Mark scan as complete to prevent overwriting results
        this.restorePhotoCountDisplay();

   //     console.log(`🎯 Cleanup complete: ${beforeCleanup} → ${this.photos.length} photos (${newPhotosFound} added, ${duplicatesRemoved + finalDuplicatesRemoved} total duplicates removed)`);

        // Show cleanup summary if there were significant changes
        const totalChanges = newPhotosFound + duplicatesRemoved + finalDuplicatesRemoved;
        if (totalChanges > 0) {
    //        console.log(`✨ Cleanup summary: Found ${newPhotosFound} additional photos, removed ${duplicatesRemoved + finalDuplicatesRemoved} total duplicates`);
        }
    }

    removeDuplicatePhotos() {
        const seen = new Set();
        const uniquePhotos = [];

        for (const photo of this.photos) {
            // Create a composite key for uniqueness detection
            const uniqueKey = this.generateUniqueKey(photo);

            if (!seen.has(uniqueKey)) {
                seen.add(uniqueKey);
                uniquePhotos.push(photo);
            } else {
         //       console.log(`🗑️ Removing duplicate photo: ${photo.ariaLabel} (${uniqueKey})`);
            }
        }

        this.photos = uniquePhotos;
    }

    generateUniqueKey(photo) {
        // Generate a unique key based on multiple criteria to catch different types of duplicates
        const components = [];

        // 1. Photo ID from URL (most reliable)
        if (photo.id && !photo.id.startsWith('photo_')) {
            components.push(`id:${photo.id}`);
        }

        // 2. Normalized URL (remove size parameters)
        if (photo.url) {
            const normalizedUrl = this.normalizeImageUrl(photo.url);
            components.push(`url:${normalizedUrl}`);
        }

        // 3. Href path (photo link)
        if (photo.href) {
            // Extract just the photo ID part from href
            const hrefMatch = photo.href.match(/photo\/([^\/\?]+)/);
            if (hrefMatch) {
                components.push(`href:${hrefMatch[1]}`);
            }
        }

        // 4. Aria label as fallback (less reliable but helps with edge cases)
        if (photo.ariaLabel && photo.ariaLabel !== 'Unknown') {
            // Normalize the aria label (remove timestamps, common variations)
            const normalizedLabel = photo.ariaLabel
                .replace(/\s+/g, ' ')
                .replace(/\s*\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?\s*/gi, '')
                .trim();
            if (normalizedLabel) {
                components.push(`label:${normalizedLabel}`);
            }
        }

        return components.join('|') || `fallback:${photo.url || Math.random()}`;
    }

    normalizeImageUrl(url) {
        try {
            const urlObj = new URL(url);

            // Remove DupeYak Duplicate Remover size parameters that might vary
            const paramsToRemove = ['w', 'h', 's', 'c', 'rw', 'rh', 'rs', 'k', 'mo'];
            paramsToRemove.forEach(param => {
                urlObj.searchParams.delete(param);
            });

            // Remove common size suffixes from path
            let pathname = urlObj.pathname;
            pathname = pathname.replace(/=w\d+-h\d+(-[a-z]+)?$/, '');
            pathname = pathname.replace(/=s\d+(-[a-z]+)?$/, '');

            return urlObj.origin + pathname + urlObj.search;
        } catch (e) {
            // If URL parsing fails, return the original URL
            return url;
        }
    }



    initializeScrollTracking() {
        // Find the scrollable container and get initial scroll info
        const scrollableContainer = this.findScrollableContainer();

        if (scrollableContainer) {
            return {
                container: scrollableContainer,
                type: 'container',
                totalScrollable: Math.max(0, scrollableContainer.scrollHeight - scrollableContainer.clientHeight),
                initialScroll: scrollableContainer.scrollTop
            };
        } else {
            // Fallback to document scrolling
            const documentHeight = Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight
            );
            const viewportHeight = window.innerHeight;

            return {
                container: null,
                type: 'document',
                totalScrollable: Math.max(0, documentHeight - viewportHeight),
                initialScroll: window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0
            };
        }
    }

    updateScanProgress(scrollInfo) {
        let currentScroll, scrollPercentage;

        if (scrollInfo.type === 'container' && scrollInfo.container) {
            currentScroll = scrollInfo.container.scrollTop;
        } else {
            currentScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        }

        if (scrollInfo.totalScrollable > 0) {
            const scrolledAmount = Math.max(0, currentScroll - scrollInfo.initialScroll);
            scrollPercentage = Math.min(100, Math.round((scrolledAmount / scrollInfo.totalScrollable) * 100));
        } else {
            // If no scrollable content, base percentage on scroll attempts
            scrollPercentage = Math.min(100, Math.round((this.scrollAttempts / this.maxScrollAttempts) * 100));
        }

        // Update the display with current photo and video count - this is the authoritative update during scanning
        const countElement = document.getElementById('pc-photo-count');
        if (countElement) {
            if (this.photos.length === 0 && this.videos.length === 0) {
           //     console.log(`🔄 updateScanProgress: Updating display to "Scanning" (no photos/videos found yet)`);
                countElement.innerHTML = 'Scanning';
            } else {
          //      console.log(`🔄 updateScanProgress: Updating display to ${this.photos.length} photos and ${this.videos.length} videos found`);
        //        countElement.innerHTML = `${this.photos.length} photos found<br/>${this.videos.length} videos found`;
            }
            countElement.className = ''; // Remove examining styling
            countElement.style.color = '';
            countElement.style.fontStyle = '';
        }

     //   console.log(`Found ${this.photos.length} photos so far (scroll progress: ${scrollPercentage}%)`);
    }

    async performScroll() {
    //    //console.log('🔍 performScroll: Analyzing DOM for scrollable containers...');

        // First, analyze the DOM structure to find the real scrollable container
        const scrollableContainer = this.findScrollableContainer();

        if (scrollableContainer) {
          //  //console.log('✅ Found scrollable container:', scrollableContainer.tagName, scrollableContainer.className);
            // //console.log('   Container scroll info:', {
            //     scrollTop: scrollableContainer.scrollTop,
            //     scrollHeight: scrollableContainer.scrollHeight,
            //     clientHeight: scrollableContainer.clientHeight,
            //     canScroll: scrollableContainer.scrollHeight > scrollableContainer.clientHeight
            // });
            return await this.scrollContainer(scrollableContainer);
        } else {
            // //console.log('❌ No scrollable container found, trying document scroll');
            // //console.log('   Document scroll info:', {
            //     scrollY: window.scrollY,
            //     documentHeight: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
            //     windowHeight: window.innerHeight,
            //     canScroll: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) > window.innerHeight
            // });
            return await this.scrollDocument();
        }
    }

    findScrollableContainer() {
    //    //console.log('🔍 Finding scrollable container using photo-based approach...');

        // Strategy 1: Find first photo and traverse up to find scrollable parent
        const photoContainer = this.findScrollableContainerFromPhoto();
        if (photoContainer) {
            // //console.log('✅ Found scrollable container via photo traversal:', {
            //     tagName: photoContainer.tagName,
            //     className: photoContainer.className,
            //     scrollHeight: photoContainer.scrollHeight,
            //     clientHeight: photoContainer.clientHeight,
            //     scrollTop: photoContainer.scrollTop
            // });
            return photoContainer;
        }

    //    //console.log('⚠️ Photo-based approach failed, trying generic selectors...');

        // Strategy 2: Fallback to generic selectors (original approach)
        const candidates = [
            // DupeYak Duplicate Remover specific selectors
            '[data-ved]',
            '[jscontroller]',
            '[role="main"]',
            // Generic SPA containers
            '[class*="scroll"]',
            '[style*="overflow"]',
            // Common patterns
            'main',
            '.main-content',
            '#content'
        ];

        for (const selector of candidates) {
            const elements = document.querySelectorAll(selector);

            for (const element of elements) {
                // Check if this element is actually scrollable
                if (this.isScrollable(element)) {
                    // console.log(`Found scrollable element with selector: ${selector}`);
                    // //console.log('Element details:', {
                    //     tagName: element.tagName,
                    //     className: element.className,
                    //     scrollHeight: element.scrollHeight,
                    //     clientHeight: element.clientHeight,
                    //     scrollTop: element.scrollTop
                    // });
                    return element;
                }
            }
        }

        // Strategy 3: Last resort - scan all elements
    //    //console.log('⚠️ Generic selectors failed, scanning all elements...');
        const allElements = document.querySelectorAll('*');
        let bestCandidate = null;
        let maxScrollableHeight = 0;

        for (const element of allElements) {
            if (this.isScrollable(element)) {
                const scrollableHeight = element.scrollHeight - element.clientHeight;
                if (scrollableHeight > maxScrollableHeight) {
                    maxScrollableHeight = scrollableHeight;
                    bestCandidate = element;
                }
            }
        }

        if (bestCandidate && maxScrollableHeight > 100) {
            // //console.log('Found best scrollable candidate:', {
            //     tagName: bestCandidate.tagName,
            //     className: bestCandidate.className,
            //     scrollableHeight: maxScrollableHeight
            // });
            return bestCandidate;
        }

        return null;
    }

    findScrollableContainerFromPhoto() {
        // //console.log('🔍 Looking for scrollable container by finding first photo...');

        // Find any photo element using the same selectors as extractPhotos
        const photoSelectors = [
            '*[style*="background-image"]',
            '*[data-latest-bg]',
            'img[src*="googleusercontent"]',
            'img[src*="ggpht.com"]'
        ];

        let firstPhotoElement = null;

        for (const selector of photoSelectors) {
            const elements = document.querySelectorAll(selector);
       //     console.log(`   Testing selector "${selector}": ${elements.length} elements`);

            for (const element of elements) {
                // For background image elements, look for photo links
                if (selector.includes('background-image') || selector.includes('data-latest-bg')) {
                    const linkElement = element.closest('a[href*="/photo/"]');
                    if (linkElement) {
                        const ariaLabel = linkElement.getAttribute('aria-label');
                        if (ariaLabel && ariaLabel.includes('Photo')) {
                            firstPhotoElement = element;
                  //          //console.log('✅ Found first photo element (background):', element.tagName, element.className);
                            break;
                        }
                    }
                } else {
                    // Direct img element
                    firstPhotoElement = element;
             //       //console.log('✅ Found first photo element (img):', element.tagName, element.src);
                    break;
                }
            }

            if (firstPhotoElement) break;
        }

        if (!firstPhotoElement) {
       //     //console.log('❌ No photo elements found');
            return null;
        }

        // Traverse up the DOM tree to find scrollable parent
        let currentElement = firstPhotoElement;
        let traversalDepth = 0;
        const maxTraversalDepth = 20; // Prevent infinite loops

   //     //console.log('🔍 Traversing up DOM tree to find scrollable parent...');

        while (currentElement && currentElement !== document.body && traversalDepth < maxTraversalDepth) {
            traversalDepth++;
            currentElement = currentElement.parentElement;

            if (currentElement) {
                console.log(`   Level ${traversalDepth}: ${currentElement.tagName} ${currentElement.className || '(no class)'}`);

                if (this.isScrollable(currentElement)) {
                    console.log(`✅ Found scrollable parent at level ${traversalDepth}:`, {
                        tagName: currentElement.tagName,
                        className: currentElement.className,
                        scrollHeight: currentElement.scrollHeight,
                        clientHeight: currentElement.clientHeight,
                        canScroll: currentElement.scrollHeight > currentElement.clientHeight
                    });
                    return currentElement;
                }
            }
        }

   //     //console.log('❌ No scrollable parent found after traversing', traversalDepth, 'levels');
        return null;
    }

    isScrollable(element) {
        if (!element || element === document.body || element === document.documentElement) {
            return false;
        }

        const style = window.getComputedStyle(element);

        // Check for explicit overflow settings
        const hasExplicitOverflow = style.overflow === 'auto' || style.overflow === 'scroll' ||
            style.overflowY === 'auto' || style.overflowY === 'scroll';

        // Check for scrollable content
        const hasScrollableContent = element.scrollHeight > element.clientHeight + 5; // 5px tolerance

        // DupeYak Duplicate Remover often uses hidden overflow with scrollable content
        // Also check for elements that might be scrollable even with overflow:hidden
        const hasHiddenOverflow = style.overflow === 'hidden' || style.overflowY === 'hidden';

        // For DupeYak Duplicate Remover, elements with large height differences might be scrollable
        // even if they don't have explicit overflow settings
        const hasSignificantHeight = element.scrollHeight > element.clientHeight + 100;

        const isScrollable = (hasExplicitOverflow && hasScrollableContent) ||
            (hasHiddenOverflow && hasSignificantHeight);

        if (isScrollable) {
            console.log(`   📊 Element is scrollable:`, {
                tagName: element.tagName,
                className: element.className.substring(0, 50) + (element.className.length > 50 ? '...' : ''),
                overflow: style.overflow,
                overflowY: style.overflowY,
                scrollHeight: element.scrollHeight,
                clientHeight: element.clientHeight,
                scrollTop: element.scrollTop,
                hasExplicitOverflow,
                hasScrollableContent,
                hasHiddenOverflow,
                hasSignificantHeight
            });
        }

        return isScrollable;
    }

    async scrollContainer(container) {
        const startScrollTop = container.scrollTop;
        const scrollStep = Math.min(container.clientHeight * 0.5, 400); // Scroll by 50% of container height or 400px max

        // console.log(`📜 Scrolling container - Current: ${startScrollTop}, Step: ${scrollStep}`);
        // console.log(`📊 Container scroll info:`, {
        //     tagName: container.tagName,
        //     className: container.className.substring(0, 50) + (container.className.length > 50 ? '...' : ''),
        //     scrollTop: container.scrollTop,
        //     scrollHeight: container.scrollHeight,
        //     clientHeight: container.clientHeight,
        //     maxScroll: container.scrollHeight - container.clientHeight,
        //     canScrollMore: container.scrollTop < (container.scrollHeight - container.clientHeight - 10)
        // });

        // Count photos before scrolling
        const photosBeforeScroll = this.photos.length;

        // Check if we're already at the bottom
        const maxScrollTop = container.scrollHeight - container.clientHeight;
        const isAtBottom = startScrollTop >= (maxScrollTop - 10); // 10px tolerance

        if (isAtBottom) {
       //     //console.log('📊 Already at bottom of container - cannot scroll further');
            return false;
        }

        // Try scrolling methods for DupeYak Duplicate Remover
        let scrolled = false;
        let newScrollTop = startScrollTop;

        // Method 1: Direct scroll assignment
  //      //console.log('📜 Trying direct scroll assignment...');
        const targetScroll = Math.min(startScrollTop + scrollStep, maxScrollTop);
        container.scrollTop = targetScroll;

        await this.delay(50);
        newScrollTop = container.scrollTop;
        scrolled = newScrollTop > startScrollTop; // Must actually move forward
        console.log(`📊 Direct scroll result: ${scrolled ? 'SUCCESS' : 'FAILED'} (${startScrollTop} → ${newScrollTop})`);

        // Method 2: Try scrollBy if direct assignment failed
        if (!scrolled) {
       //     //console.log('📜 Trying scrollBy...');
            container.scrollBy({
                top: scrollStep,
                behavior: 'auto'
            });

            await this.delay(50);
            newScrollTop = container.scrollTop;
            scrolled = newScrollTop > startScrollTop; // Must actually move forward
  //          console.log(`📊 ScrollBy result: ${scrolled ? 'SUCCESS' : 'FAILED'} (${startScrollTop} → ${newScrollTop})`);
        }

        // Method 3: Try scrollIntoView on a lower element
        if (!scrolled) {
        //    //console.log('📜 Trying scrollIntoView method...');
            const childElements = container.querySelectorAll('*');
            if (childElements.length > 10) {
                const targetElement = childElements[Math.floor(childElements.length * 0.7)]; // Scroll to 70% down
                try {
                    targetElement.scrollIntoView({ behavior: 'auto', block: 'start' });
                    await this.delay(50);
                    newScrollTop = container.scrollTop;
                    scrolled = newScrollTop > startScrollTop; // Must actually move forward
                    console.log(`📊 ScrollIntoView result: ${scrolled ? 'SUCCESS' : 'FAILED'} (${startScrollTop} → ${newScrollTop})`);
                } catch (error) {
           //         //console.log('⚠️ ScrollIntoView failed:', error.message);
                }
            }
        }

        // Wait for photos to load their backgrounds
     //   //console.log('⏳ Waiting for photos to load after scroll...');
        const photosLoaded = await this.waitForPhotosToLoad();
        console.log(`📊 Photos loaded after scroll: ${photosLoaded}`);

        const photosAfterScroll = this.photos.length;
        const newPhotosFound = photosAfterScroll - photosBeforeScroll;

        const scrollResult = {
            scrolled,
            startScrollTop,
            newScrollTop,
            scrollDelta: newScrollTop - startScrollTop,
            photosBeforeScroll,
            photosAfterScroll,
            newPhotosFound
        };

      //  console.log(`📊 Final container scroll result:`, scrollResult);

        return scrollResult;
    }

    async scrollDocument() {
        // Fallback: try document scrolling (like screenshot extensions)
        const startScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        const scrollStep = window.innerHeight * 0.5; // Scroll by half viewport height

    //    console.log(`Document scroll - Current: ${startScrollY}, Step: ${scrollStep}`);
    //   console.log(`Document height: ${Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)}`);

        // Check if we're already at the bottom
        const maxScroll = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;
        const isAtBottom = startScrollY >= (maxScroll - 10); // 10px tolerance

        if (isAtBottom) {
     //       //console.log('📊 Already at bottom of document - cannot scroll further');
            return false;
        }

        // Count photos before scrolling
        const photosBeforeScroll = this.photos.length;

        // Try scrollBy first
        window.scrollBy({
            top: scrollStep,
            left: 0,
            behavior: 'auto'
        });

        await this.delay(50);

        // Wait for photos to load their backgrounds
        const photosLoaded = await this.waitForPhotosToLoad();
    //    console.log(`Photos loaded after document scroll: ${photosLoaded}`);

        const newScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        const scrolled = newScrollY > startScrollY; // Must actually move forward
        const photosAfterScroll = this.photos.length;
        const newPhotosFound = photosAfterScroll - photosBeforeScroll;

     //   console.log(`Document scroll result - New: ${newScrollY}, Scrolled: ${scrolled}, New photos: ${newPhotosFound}`);

        if (!scrolled) {
            // Fallback: direct assignment
            const targetScroll = startScrollY + scrollStep;
            const maxScroll = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;
            const scrollTo = Math.min(targetScroll, maxScroll);

     //       console.log(`Document fallback scroll to: ${scrollTo}`);

            window.scrollTo({
                top: scrollTo,
                left: 0,
                behavior: 'auto'
            });

            await this.delay(50);

            // Wait for photos to load after fallback scroll
            await this.waitForPhotosToLoad();

            const finalScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
            const finalScrolled = finalScrollY > startScrollY; // Must actually move forward
            const finalPhotosAfterScroll = this.photos.length;
            const finalNewPhotosFound = finalPhotosAfterScroll - photosBeforeScroll;

            const fallbackResult = {
                scrolled: finalScrolled,
                startScrollTop: startScrollY,
                newScrollTop: finalScrollY,
                scrollDelta: finalScrollY - startScrollY,
                photosBeforeScroll,
                photosAfterScroll: finalPhotosAfterScroll,
                newPhotosFound: finalNewPhotosFound
            };

    //        console.log(`Document final scroll result:`, fallbackResult);
            return fallbackResult;
        }

        const scrollResult = {
            scrolled,
            startScrollTop: startScrollY,
            newScrollTop: newScrollY,
            scrollDelta: newScrollY - startScrollY,
            photosBeforeScroll,
            photosAfterScroll,
            newPhotosFound
        };

        return scrollResult;
    }



    async waitForPhotosToLoad(maxWaitTime = 4000) {
        // Wait for photos to load their background images after scrolling
        const startTime = Date.now();
        let lastPhotoCount = this.photos.length;
        let lastBackgroundLoadedCount = 0;
        let stableChecks = 0;
        let backgroundStableChecks = 0;
        const maxStableChecks = 4; // Number of consecutive checks with no new photos
        const maxBackgroundStableChecks = 3; // Number of checks with stable background loading
        const checkInterval = 500; // Check every 500ms (less frequent)

        console.log(`⏳ Waiting for photos to load after scroll. Current count: ${lastPhotoCount}`);

        while (Date.now() - startTime < maxWaitTime) {
            await this.delay(checkInterval);

            // Extract photos to see if any new ones have appeared
            this.extractPhotos(false, true); // non-thorough, silent
            const currentPhotoCount = this.photos.length;
            const newPhotosFound = currentPhotoCount - lastPhotoCount;

            if (newPhotosFound > 0) {
                console.log(`📈 Found ${newPhotosFound} new photos (total: ${currentPhotoCount})`);
                lastPhotoCount = currentPhotoCount;
                stableChecks = 0; // Reset stable count when we find new photos
                backgroundStableChecks = 0; // Reset background stability too
            } else {
                stableChecks++;
                console.log(`⏳ No new photos in check ${stableChecks}/${maxStableChecks}`);
            }

            // Check if background images are actually loaded and rendered
            const photosWithBackgrounds = await this.checkPhotosHaveBackgrounds();
            const backgroundLoadRatio = photosWithBackgrounds.checked > 0 ?
                photosWithBackgrounds.loaded / photosWithBackgrounds.checked : 1;

            console.log(`📊 Background load status: ${photosWithBackgrounds.loaded}/${photosWithBackgrounds.checked} (${(backgroundLoadRatio * 100).toFixed(1)}%)`);

            // Track background loading stability
            if (photosWithBackgrounds.loaded === lastBackgroundLoadedCount) {
                backgroundStableChecks++;
            } else {
                backgroundStableChecks = 0;
                lastBackgroundLoadedCount = photosWithBackgrounds.loaded;
            }

            // Relaxed exit conditions to prevent infinite loops:
            // 1. No new photos for several checks AND decent background loading
            if (stableChecks >= maxStableChecks && backgroundLoadRatio >= 0.75) {
                console.log(`✅ Photos stable with acceptable background loading (${(backgroundLoadRatio * 100).toFixed(1)}%). Ending wait after ${Date.now() - startTime}ms`);
                break;
            }

            // 2. Recent photos found and backgrounds are well-loaded
            if (stableChecks <= 1 && backgroundLoadRatio >= 0.9) {
                console.log(`✅ Recent photos found and well-loaded. Ending wait early after ${Date.now() - startTime}ms`);
                break;
            }

            // 3. Minimum wait time has passed and we have some background loading
            if (Date.now() - startTime >= 1500 &&
                stableChecks >= 2 &&
                backgroundLoadRatio >= 0.7) {
                console.log(`✅ Minimum wait completed with reasonable loading (${(backgroundLoadRatio * 100).toFixed(1)}%). Ending wait after ${Date.now() - startTime}ms`);
                break;
            }

            // 4. Extended wait with very stable photos but lower background ratio (prevent infinite loops)
            if (stableChecks >= maxStableChecks + 2 &&
                backgroundStableChecks >= maxBackgroundStableChecks + 1 &&
                backgroundLoadRatio >= 0.6) {
                console.log(`⚠️ Extended stability reached with ${(backgroundLoadRatio * 100).toFixed(1)}% backgrounds. Proceeding to prevent loop.`);
                break;
            }
        }

        const totalWaitTime = Date.now() - startTime;
        const totalNewPhotos = this.photos.length - lastPhotoCount;

        if (totalWaitTime >= maxWaitTime) {
            console.log(`⏰ Wait timeout reached (${totalWaitTime}ms). Final count: ${this.photos.length}`);
        }

        console.log(`📊 Wait complete: ${totalNewPhotos} new photos found, total: ${this.photos.length}`);
        return this.photos.length;
    }

    async checkAndHandleIncompleteBackgrounds() {
        // Check if there are photos without loaded backgrounds and scroll back if needed
    //    //console.log('🔍 Checking for photos with incomplete backgrounds...');

        const photosWithBackgrounds = await this.checkPhotosHaveBackgrounds();
        const backgroundLoadRatio = photosWithBackgrounds.checked > 0 ?
            photosWithBackgrounds.loaded / photosWithBackgrounds.checked : 1;

        console.log(`📊 Current background status: ${photosWithBackgrounds.loaded}/${photosWithBackgrounds.checked} (${(backgroundLoadRatio * 100).toFixed(1)}%)`);

        // If less than 80% of photos have backgrounds loaded, we need to backtrack
        if (backgroundLoadRatio < 0.8 && photosWithBackgrounds.checked > 0) {
      //      //console.log('⚠️ Too many photos missing backgrounds - initiating backtrack...');

            const currentScrollContainer = this.findScrollableContainer();
            const currentScrollPosition = currentScrollContainer ?
                currentScrollContainer.scrollTop : window.pageYOffset;

    //        console.log(`📍 Current scroll position: ${currentScrollPosition}`);

            // Scroll back by 1-2 viewports to give photos more time to load
            const backtrackAmount = currentScrollContainer ?
                Math.min(currentScrollContainer.clientHeight * 1.5, 800) :
                Math.min(window.innerHeight * 1.5, 800);

    //        console.log(`⏪ Scrolling back ${backtrackAmount}px to allow background loading...`);

            if (currentScrollContainer) {
                const targetPosition = Math.max(0, currentScrollPosition - backtrackAmount);
                currentScrollContainer.scrollTop = targetPosition;
                console.log(`📍 Scrolled back to position: ${targetPosition}`);
            } else {
                const targetPosition = Math.max(0, currentScrollPosition - backtrackAmount);
                window.scrollTo(0, targetPosition);
                console.log(`📍 Scrolled document back to position: ${targetPosition}`);
            }

            // Wait for backgrounds to load at the backtracked position
    //        //console.log('⏳ Waiting for backgrounds to load at backtracked position...');
            await this.waitForPhotosToLoad(8000); // Longer wait for backtrack

            // Check if backtracking helped
            const afterBacktrackStatus = await this.checkPhotosHaveBackgrounds();
            const afterBacktrackRatio = afterBacktrackStatus.checked > 0 ?
                afterBacktrackStatus.loaded / afterBacktrackStatus.checked : 1;

    //        console.log(`📊 After backtrack: ${afterBacktrackStatus.loaded}/${afterBacktrackStatus.checked} (${(afterBacktrackRatio * 100).toFixed(1)}%)`);

            // Scroll back to where we were (or close to it)
    //        //console.log('⏩ Returning to forward scroll position...');
            if (currentScrollContainer) {
                currentScrollContainer.scrollTop = currentScrollPosition;
            } else {
                window.scrollTo(0, currentScrollPosition);
            }

            // Small delay to let DOM settle after scrolling back
            await this.delay(500);

    //        console.log(`✅ Backtrack complete. Improvement: ${((afterBacktrackRatio - backgroundLoadRatio) * 100).toFixed(1)}%`);

            return true; // Indicate that backtracking occurred
        } else {
   //         //console.log('✅ Background loading is sufficient - no backtrack needed');
            return false; // No backtracking needed
        }
    }

    async checkPhotosHaveBackgrounds() {
        // Check how many photos have their background images loaded
        let photosWithBackgrounds = 0;

        // Check more photos, but prioritize recent ones
        const photosToCheck = Math.min(this.photos.length, 30); // Check up to 30 photos
        const startIndex = Math.max(0, this.photos.length - photosToCheck);
        const photosToCheckArray = this.photos.slice(startIndex);

    //    console.log(`Checking backgrounds for ${photosToCheckArray.length} photos (from index ${startIndex})...`);

        for (let i = 0; i < photosToCheckArray.length; i++) {
            const photo = photosToCheckArray[i];
            if (photo.element) {
                const hasBackground = this.elementHasLoadedBackground(photo.element);
                if (hasBackground) {
                    photosWithBackgrounds++;
                } else {
                    // Debug: log first few photos that don't have backgrounds
                    if (i < 2) {
         //               console.log(`Photo ${startIndex + i} (${photo.ariaLabel}) - No background detected`);
                        const bgElements = photo.element.querySelectorAll('*[style*="background-image"], *[data-latest-bg]');
                        console.log(`  Found ${bgElements.length} potential background elements`);
                        bgElements.forEach((el, idx) => {
                            if (idx < 1) { // Only log first element to reduce spam
                                console.log(`    Element ${idx}:`, {
                                    style: el.getAttribute('style')?.substring(0, 80) + '...',
                                    dataLatestBg: el.getAttribute('data-latest-bg')?.substring(0, 40) + '...'
                                });
                            }
                        });
                    }
                }
            }
        }

   //     console.log(`Background check result: ${photosWithBackgrounds}/${photosToCheckArray.length} photos have backgrounds`);
        return {
            loaded: photosWithBackgrounds,
            checked: photosToCheckArray.length,
            total: this.photos.length
        };
    }

    elementHasLoadedBackground(element) {
        // Check if this photo element has a loaded background image
        // Use the same logic as extractPhotos() to ensure consistency

        // Look for background elements within this photo link
        const bgElements = element.querySelectorAll('*[style*="background-image"], *[data-latest-bg]');

        for (const bgElement of bgElements) {
            const style = bgElement.getAttribute('style');
            const dataLatestBg = bgElement.getAttribute('data-latest-bg');

            // Check data-latest-bg first (most reliable for DupeYak Duplicate Remover)
            if (dataLatestBg && dataLatestBg.trim() !== '') {
                // If data-latest-bg exists and is not empty, consider it loaded
                // DupeYak Duplicate Remover uses this attribute when images are ready
                return true;
            }

            // Check background-image in style attribute
            if (style) {
                const patterns = [
                    /background-image:\s*url\(&quot;([^&"]+)&quot;\)/,  // &quot; encoded quotes
                    /background-image:\s*url\("([^"]+)"\)/,           // Regular quotes
                    /background-image:\s*url\('([^']+)'\)/,           // Single quotes
                    /background-image:\s*url\(([^)]+)\)/              // No quotes
                ];

                for (const pattern of patterns) {
                    const urlMatch = style.match(pattern);
                    if (urlMatch && urlMatch[1] && urlMatch[1].trim() !== '') {
                        const imageUrl = urlMatch[1].trim();
                        if (imageUrl !== 'none' && imageUrl.length > 10) {
                            // Basic checks: URL exists and looks like a real image URL
                            if (imageUrl.includes('googleusercontent.com') ||
                                imageUrl.includes('ggpht.com') ||
                                imageUrl.includes('photos.google.com')) {

                                // For DupeYak Duplicate Remover URLs, also check if element has some dimensions
                                const rect = bgElement.getBoundingClientRect();
                                if (rect.width > 0 && rect.height > 0) {
                                    return true;
                                }

                                // Fallback: if it's a DupeYak Duplicate Remover URL with style, consider it loaded
                                // even if dimensions are 0 (might be a CSS/layout issue)
                                return true;
                            }
                        }
                    }
                }
            }
        }

        return false;
    }

    extractPhotos(thorough = false, silent = false) {
        const beforeCount = this.photos.length;

        if (!silent) {
            // //console.log('🔍 extractPhotos called:');
            // //console.log('   thorough:', thorough);
            // //console.log('   silent:', silent);
            // //console.log('   Current photos count:', beforeCount);
            // //console.log('   DOM ready state:', document.readyState);
            // //console.log('   Current URL:', window.location.href);
            // //console.log('   isScanning:', this.isScanning);
        }

        // Find all elements with background images (back to original approach)
        let allElements;

        if (thorough) {
            // More comprehensive search in thorough mode
            allElements = document.querySelectorAll([
                '*[style*="background-image"]',
                '*[data-latest-bg]',
                '*[style*="background"]',  // Catch background shorthand
                'img[src*="googleusercontent"]',  // Direct img elements
                'img[src*="photos.google"]'
            ].join(', '));
    //        console.log(`🔍 Thorough mode: Found ${allElements.length} potential photo elements`);
        } else {
            allElements = document.querySelectorAll('*[style*="background-image"], *[data-latest-bg]');
    //        console.log(`📊 Standard mode: Found ${allElements.length} elements with background images`);

            // Debug: Test individual selectors
            const bgImageElements = document.querySelectorAll('*[style*="background-image"]');
            const dataLatestBgElements = document.querySelectorAll('*[data-latest-bg]');
            console.log(`   - background-image elements: ${bgImageElements.length}`);
            console.log(`   - data-latest-bg elements: ${dataLatestBgElements.length}`);
        }

        // Use for...of loop instead of forEach to allow proper breaking
        for (let index = 0; index < allElements.length; index++) {
            const element = allElements[index];
            let linkElement, imageUrl, ariaLabel;

            // Handle different types of elements
            if (element.tagName === 'IMG') {
                // Direct img element
                linkElement = element.closest('a[href*="/photo/"]');
                imageUrl = element.src;
                ariaLabel = element.alt || element.getAttribute('aria-label');
            } else {
                // Background image element
                linkElement = element.closest('a[href*="/photo/"]');
                if (!linkElement) continue;

                ariaLabel = linkElement.getAttribute('aria-label');

                const style = element.getAttribute('style');
                const dataLatestBg = element.getAttribute('data-latest-bg');

                // Extract background image URL
                if (dataLatestBg) {
                    imageUrl = dataLatestBg;
                } else if (style) {
                    // Handle multiple background-image URL formats
                    let urlMatch = null;

                    // Try different patterns for background-image URLs
                    const patterns = [
                        /background-image:\s*url\(&quot;([^&"]+)&quot;\)/,  // &quot; encoded quotes
                        /background-image:\s*url\("([^"]+)"\)/,           // Regular quotes
                        /background-image:\s*url\('([^']+)'\)/,           // Single quotes
                        /background-image:\s*url\(([^)]+)\)/              // No quotes
                    ];

                    for (const pattern of patterns) {
                        urlMatch = style.match(pattern);
                        if (urlMatch && urlMatch[1]) {
                            imageUrl = urlMatch[1];
                            break;
                        }
                    }
                }
            }

            // Skip if no link element found (for non-img elements)
            if (element.tagName !== 'IMG' && !linkElement) continue;

            // Detect videos using structural detection (language-independent)
            let isVideo = false;
            if (linkElement) {
                // Check for video-specific structural elements
                const parentElement = linkElement.parentElement;
                isVideo = parentElement && (
                    // Video has additional "e37Orb" class on main container
                    parentElement.classList.contains('e37Orb') ||
                    // Video has duration display element
                    parentElement.querySelector('.KhS5De') ||
                    // Video has progress bar controller
                    parentElement.querySelector('[jscontroller="qUYJve"]') ||
                    // Video has play button SVG (triangle path)
                    parentElement.querySelector('svg path[d*="M10 16.5l6-4.5-6-4.5z"]')
                );
            }

            // Process both photos and videos (videos analyzed via thumbnails)
            if (imageUrl) {
                if (isVideo) {
                    // Check if we already have this video (prevent duplicate counting)
                    const existingVideo = this.videos.find(v =>
                        v.element === linkElement ||
                        (imageUrl && v.url === imageUrl)
                    );

                    if (!existingVideo) {
                        const videoId = this.generatePhotoId(linkElement || element, index);
                        const currentScrollPosition = this.getCurrentScrollPosition();

                        this.videos.push({
                            id: videoId,
                            url: imageUrl,
                            element: linkElement || element,
                            ariaLabel: ariaLabel || 'Unknown',
                            href: linkElement ? linkElement.getAttribute('href') || '' : '',
                            processed: false,
                            scrollPosition: currentScrollPosition
                        });
                        this.videosFound++;

                        // Also store in scroll position map
                        this.photoScrollPositions.set(videoId, currentScrollPosition);

                        if (!silent) {
                     //       console.log(`📹 Found video: ${ariaLabel || 'Unknown'} (total videos: ${this.videosFound})`);
                        }
                    }
                    continue; // Continue to next element after processing video
                }
            }

            // If we have a linkElement, it means href contains "/photo/" which is what we want
            // This works for both photos and videos, but videos are filtered out above

            // Skip if we already have this photo (check both URL and element)
            if (imageUrl) {
                const existingPhoto = this.photos.find(p =>
                    p.url === imageUrl ||
                    (linkElement && p.element === linkElement)
                );

                if (!existingPhoto) {
                    const photoId = this.generatePhotoId(linkElement || element, index);

                    // NEW: Get current scroll position where this photo was found
                    const currentScrollPosition = this.getCurrentScrollPosition();

                    if (!silent) {
                        if (thorough) {
               //             console.log(`🔍 Thorough: Found photo: ${ariaLabel || 'Unknown'} -> ${imageUrl}`);
                        } else {
                 //           console.log(`Found photo: ${ariaLabel} -> ${imageUrl}`);
                        }
                //        console.log(`📍 Photo found at scroll position: ${currentScrollPosition}`);
                    }

                    this.photos.push({
                        id: photoId,
                        url: imageUrl,
                        element: linkElement || element,
                        ariaLabel: ariaLabel || 'Unknown',
                        href: linkElement ? linkElement.getAttribute('href') || '' : '',
                        processed: false,
                        scrollPosition: currentScrollPosition // NEW: Store scroll position
                    });

                    // NEW: Also store in our scroll position map for quick lookup
                    this.photoScrollPositions.set(photoId, currentScrollPosition);


                }
            }
        }

        const afterCount = this.photos.length;
        const newPhotosFound = afterCount - beforeCount;

        if (!silent) {
  //          console.log(`📊 extractPhotos completed: ${afterCount} total photos (${newPhotosFound} new)`);
        }

        // Only update photo count if we're not actively scanning and not in silent mode
        // During scanning, progress is handled by updateScanProgress()
        if (!this.isScanning && !silent) {
            this.updatePhotoCount();
        }
    }

    generatePhotoId(element, index) {
        const href = element.getAttribute('href') || '';
        const match = href.match(/photo\/([^\/]+)/);
        return match ? match[1] : `photo_${index}_${Date.now()}`;
    }

    // NEW: Get current scroll position (works with both container and document scrolling)
    getCurrentScrollPosition() {
        const scrollContainer = this.findScrollableContainer();
        if (scrollContainer) {
            return scrollContainer.scrollTop;
        } else {
            return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        }
    }

    updatePhotoCount() {
        // Don't update if scan is complete - preserve the "ready for analysis" message
        if (this.scanComplete) {
            console.log(`📊 updatePhotoCount: Skipping - scan complete`);
            return;
        }

        // Don't update if actively scanning - updateScanProgress handles this
        if (this.isScanning) {
            console.log(`📊 updatePhotoCount: Skipping - actively scanning (isScanning=${this.isScanning})`);
            return;
        }

        const countElement = document.getElementById('pc-photo-count');
        if (countElement) {
            // If no photos or videos found and we're in idle state, preserve "Idle" text
            if (this.photos.length === 0 && this.videos.length === 0 && !this.isProcessing) {
                console.log(`📊 updatePhotoCount: Preserving idle state (no photos/videos, not processing)`);
                countElement.innerHTML = 'Idle';
            } else {
                console.log(`📊 updatePhotoCount: Updating display to ${this.photos.length} photos and ${this.videos.length} videos found`);
          //      countElement.innerHTML = `${this.photos.length} photos found<br/>${this.videos.length} videos found`;
            }

            // Reset styling in case it was changed during scanning
            countElement.className = '';
            countElement.style.color = '';
            countElement.style.fontStyle = '';
        }
    }

    restorePhotoCountDisplay() {
        const countElement = document.getElementById('pc-photo-count');
        if (countElement) {
            const photoCount = this.processedPhotosCount || this.photos.length;
            const videoCount = this.videos.length;
            countElement.innerHTML = `✅ ${photoCount} photos processed<br/>✅ ${videoCount} videos processed`;
            countElement.className = '';
            countElement.style.color = '#4CAF50';
            countElement.style.fontStyle = 'normal';
            countElement.style.fontWeight = '500';
        }
    }

    updateCleanupProgress(message) {
        const countElement = document.getElementById('pc-photo-count');
        if (countElement) {
            countElement.innerHTML = message;
            countElement.className = '';
            countElement.style.color = '#FF9800';
            countElement.style.fontStyle = 'italic';
        }
    }
//convert to jquery
    async analyzePhotos() {
        if (this.photos.length < 2 && this.videos.length < 2) {
            alert('Need at least 2 photos or videos to analyze');
            return;
        }

        // Reset group counting flag for new analysis
        this.groupsAlreadyCounted = false;

        this.showProgress(true);
        this.updateProgress(0, 'Creating frontend analysis session...');

        try {
            // Step 1: Create frontend session
            const sessionId = this.frontendSessionManager.createSession();
        //    //console.log('📊 Created frontend analysis session:', sessionId);

            this.updateProgress(5, 'Processing photos and videos with frontend hash computation...');

            // Step 2: Upload photos and videos to frontend session (with hash computation)
            await this.uploadPhotosToFrontendSession(sessionId);
            // await this.uploadVideosToFrontendSession(sessionId);

            this.updateProgress(85, 'Running frontend similarity analysis...');

            // Step 3: Set up progress callback for detailed analysis progress
            this.frontendSessionManager.progressCallback = (percent, message) => {
                // Map the analysis progress (10-100%) to our overall progress (85-95%)
                const mappedPercent = 85 + (percent - 10) * 0.1; // 85% + 10% range
                this.updateProgress(mappedPercent, message);
            };

            // Step 4: Perform frontend analysis
            const similarityThreshold = this.similarityThreshold || $('#pc-similarity').val() || 75;
            console.log(`🎯 Using similarity threshold: ${similarityThreshold}%`);
            const results = await this.frontendSessionManager.analyzeSession(sessionId, parseInt(similarityThreshold));

            // Clear progress callback
            this.frontendSessionManager.progressCallback = null;

            // Step 4: Transform results to match expected format (separate photos and videos)
            const transformedResults = this.transformFrontendResults(results, sessionId);

            // Store the processed count from the frontend results
            this.processedPhotosCount = transformedResults.total_images || this.photos.length;

            this.updateProgress(100, 'Frontend analysis complete!');

            await this.delay(500);
            this.showProgress(false);

            this.showResults(transformedResults);

        } catch (error) {
            console.error('Error analyzing photos with frontend:', error);
            this.showProgress(false);
            // alert('Error analyzing photos: ' + error.message);
        }
    }

    async uploadPhotosToFrontendSession(sessionId) {
        console.log(`Processing ${this.photos.length} photos in frontend session using optimized batch screenshot method`);

        // Calculate optimal batch layout
        const layout = this.calculateOptimalBatchLayout();
        const batchSize = layout.batchSize;

        console.log(`📸 Processing up to ${batchSize} images simultaneously - estimated time: ~${Math.ceil(this.photos.length / batchSize * 0.8)} seconds`);

        let uploaded = 0;

        // Show screenshot area with dynamic layout
        this.showScreenshotArea(layout);

        for (let i = 0; i < this.photos.length; i += batchSize) {
            const batch = this.photos.slice(i, i + batchSize);
            const progressPercent = 5 + ((i / this.photos.length) * 75); // 5% to 80%

            this.updateProgress(
                progressPercent,
                `Preparing ${i + batch.length}/${this.photos.length} photos`
            );

            try {
                const batchResults = await this.processBatchScreenshotsForFrontend(sessionId, batch, i, layout);
                uploaded += batchResults;
                console.log(`✅ Frontend batch ${Math.floor(i / batchSize) + 1} complete: ${batchResults}/${batch.length} images processed`);

                // Brief pause between batches to avoid overwhelming the system
                if (i + batchSize < this.photos.length) {
                    await this.delay(400);
                }
            } catch (error) {
                console.error(`❌ Frontend batch ${Math.floor(i / batchSize) + 1} failed:`, error);
            }
        }

        // Hide screenshot area
        this.hideScreenshotArea();

        console.log(`Successfully processed ${uploaded}/${this.photos.length} photo screenshots in frontend`);
        return uploaded;
    }

    // async uploadVideosToFrontendSession(sessionId) {
    //     if (this.videos.length === 0) {
    //         //console.log('No videos to process');
    //         return 0;
    //     }

    //     console.log(`Processing ${this.videos.length} video thumbnails in frontend session using optimized batch screenshot method`);

    //     // Calculate optimal batch layout for videos
    //     const layout = this.calculateOptimalBatchLayout();
    //     const batchSize = layout.batchSize;

    //     console.log(`📹 Processing up to ${batchSize} video thumbnails simultaneously - estimated time: ~${Math.ceil(this.videos.length / batchSize * 0.8)} seconds`);

    //     let uploaded = 0;

    //     // Show screenshot area with dynamic layout
    //     this.showScreenshotArea(layout);

    //     for (let i = 0; i < this.videos.length; i += batchSize) {
    //         const batch = this.videos.slice(i, i + batchSize);
    //         const progressPercent = 5 + ((i / this.videos.length) * 75); // 5% to 80%

    //         this.updateProgress(
    //             progressPercent,
    //             `Preparing ${i + batch.length}/${this.videos.length} video thumbnails`
    //         );

    //         try {
    //             const batchResults = await this.processBatchScreenshotsForFrontendVideos(sessionId, batch, i, layout);
    //             uploaded += batchResults;
    //             console.log(`✅ Frontend video batch ${Math.floor(i / batchSize) + 1} complete: ${batchResults}/${batch.length} video thumbnails processed`);

    //             // Brief pause between batches to avoid overwhelming the system
    //             if (i + batchSize < this.videos.length) {
    //                 await this.delay(400);
    //             }
    //         } catch (error) {
    //             console.error(`❌ Frontend video batch ${Math.floor(i / batchSize) + 1} failed:`, error);
    //         }
    //     }

    //     // Hide screenshot area
    //     this.hideScreenshotArea();

    //     console.log(`Successfully processed ${uploaded}/${this.videos.length} video thumbnail screenshots in frontend`);
    //     return uploaded;
    // }

    transformFrontendResults(frontendResults, sessionId) {
        // Transform frontend results to match the expected server format
        const session = this.frontendSessionManager.getSessionStatus(sessionId);

        return {
            success: true,
            session_id: sessionId,
            total_images: frontendResults.total_images,
            similar_groups: frontendResults.similar_groups,
            total_comparisons: frontendResults.total_comparisons,
            similar_pairs_found: frontendResults.similar_pairs_found,
            analysis_time: frontendResults.analysis_time,
            similarity_threshold: frontendResults.similarity_threshold,
            status: session.status,
            analysis_status: session.analysis_status,
            last_analysis: session.last_analysis,
            created_at: session.created_at
        };
    }

    async processBatchScreenshotsForFrontend(sessionId, photoBatch, startIndex, layout) {
        const container = document.getElementById('pc-screenshot-container');
        if (!container) {
            throw new Error('Screenshot container not found');
        }

        // Clear previous screenshots
        container.innerHTML = '';

        // Create screenshot slots for this batch
        const screenshotSlots = [];
        for (let i = 0; i < photoBatch.length; i++) {
            const photo = photoBatch[i];
            const slot = this.createScreenshotSlot(photo, startIndex + i, layout);
            container.appendChild(slot.element);
            screenshotSlots.push(slot);
        }

        // Start loading all images simultaneously - handle failures gracefully
        const loadPromises = screenshotSlots.map(slot =>
            this.loadImageInSlot(slot).catch(error => {
                console.log(`⚠️ Skipping image ${slot.photo.id}: ${error.message}`);
                slot.loadFailed = true;
                return null;
            })
        );
        await Promise.all(loadPromises);

        // Wait for all images to be fully rendered
        await this.delay(800);

        // Respect rate limiting before screenshot
        await this.respectScreenshotRateLimit();

        // Capture screenshot of the entire batch area
        const batchScreenshot = await this.captureBatchScreenshot();

        // Process each image from the batch screenshot and compute hashes in frontend
        let uploaded = 0;
        for (let i = 0; i < screenshotSlots.length; i++) {
            const slot = screenshotSlots[i];
            const photo = photoBatch[i];

            // Skip images that failed to load
            if (slot.loadFailed) {
                console.log(`⏭️ Skipping failed image ${startIndex + i + 1}: ${photo.id}`);
                continue;
            }

            try {
                // Crop individual image from batch screenshot
                const croppedImage = await this.cropImageFromBatch(batchScreenshot, slot.bounds);

                if (croppedImage) {
                    console.log(`🖼️ Frontend processing image ${startIndex + i + 1}: ${photo.id}`);

                    // Store captured image data for AI selection
                    photo.capturedImageData = croppedImage;
                    console.log(`💾 Stored captured image data for photo ${photo.id} (for AI selection)`);

                    // Add to frontend session (compute hashes)
                    const result = await this.frontendSessionManager.addImage(sessionId, photo.id, croppedImage);

                    if (result.success) {
                        uploaded++;
                        console.log(`✅ Frontend processed image ${startIndex + i + 1}: ${photo.ariaLabel}`);
                    } else {
                        console.warn(`❌ Frontend failed to process image ${startIndex + i + 1}: ${result.error}`);
                    }
                } else {
                    console.warn(`❌ Failed to crop image ${startIndex + i + 1}: ${photo.id}`);
                }
            } catch (error) {
                console.warn(`❌ Failed to process image ${startIndex + i + 1}: ${photo.id}`, error);
            }
        }

        return uploaded;
    }

    renderGroupsSection(groups, mediaType) {
        const groupsToShow = groups;
        const maxSelectableGroups = this.isPaidVersion ? groupsToShow.length : 2;
        const nonSelectableGroups = groupsToShow.length - maxSelectableGroups;
        const mediaArray = mediaType === 'video' ? this.videos : this.photos;
        const mediaEmoji = mediaType === 'video' ? '📹' : '📸';

        let groupsHtml = groupsToShow.map((group, index) => {
            const isSelectable = this.isPaidVersion || index < maxSelectableGroups;
            const groupHeaderClass = isSelectable ? '' : 'pc-group-non-selectable';
            const selectionDisabled = !isSelectable;

            return `
                <div class="pc-group ${groupHeaderClass}" data-group-index="${group.originalIndex}" data-media-type="${mediaType}" ${selectionDisabled ? 'data-non-selectable="true"' : ''}>
                    <div class="pc-group-header">
                        <h4>${mediaEmoji} Group ${index + 1} (${Math.round(group.similarity_score * 100)}% similar)${!isSelectable ? ' 🔒' : ''}</h4>
                        <div class="pc-group-controls-row">
                            <button class="pc-group-toggle pc-btn pc-btn-secondary" data-group-index="${group.originalIndex}" data-media-type="${mediaType}" ${selectionDisabled ? 'disabled title="Upgrade to Pro to select items in this group"' : `title="Select or unselect all ${mediaType}s in this group for deletion"`}>
                                ☐ Select All${selectionDisabled ? ' (Pro)' : ''}
                            </button>
                            
                            <button class="pc-btn pc-btn-group-ai" data-group-index="${group.originalIndex}" data-media-type="${mediaType}" ${!isSelectable ? 'disabled title="Upgrade to Pro to select items in this group"' : (!this.isPaidVersion ? 'disabled title="Upgrade to Pro for AI-powered smart selection"' : 'title="Use AI face detection to keep happier expressions in this group"')}>
                                🧠${!this.isPaidVersion ? ' (Pro)' : ''}
                            </button>
                            
                            <button class="pc-btn pc-btn-group-metadata" data-group-index="${group.originalIndex}" data-criteria="size" data-preference="larger" data-media-type="${mediaType}" ${!isSelectable ? 'disabled title="Upgrade to Pro to select items in this group"' : (!this.isPaidVersion ? 'disabled title="Upgrade to Pro for metadata-based selection"' : 'title="Keep larger file size in this group"')}>
                                💾➕
                            </button>
                            <button class="pc-btn pc-btn-group-metadata" data-group-index="${group.originalIndex}" data-criteria="size" data-preference="smaller" data-media-type="${mediaType}" ${!isSelectable ? 'disabled title="Upgrade to Pro to select items in this group"' : (!this.isPaidVersion ? 'disabled title="Upgrade to Pro for metadata-based selection"' : 'title="Keep smaller file size in this group"')}>
                                💾➖
                            </button>
                            <button class="pc-btn pc-btn-group-metadata" data-group-index="${group.originalIndex}" data-criteria="storageSize" data-preference="larger" data-media-type="${mediaType}" ${!isSelectable ? 'disabled title="Upgrade to Pro to select items in this group"' : (!this.isPaidVersion ? 'disabled title="Upgrade to Pro for metadata-based selection"' : `title="Keep ${mediaType} that takes more Google account space in this group"`)}>
                                💳➕
                            </button>
                            <button class="pc-btn pc-btn-group-metadata" data-group-index="${group.originalIndex}" data-criteria="storageSize" data-preference="smaller" data-media-type="${mediaType}" ${!isSelectable ? 'disabled title="Upgrade to Pro to select items in this group"' : (!this.isPaidVersion ? 'disabled title="Upgrade to Pro for metadata-based selection"' : `title="Keep ${mediaType} that takes less Google account space in this group"`)}>
                                💳➖
                            </button>
                            <button class="pc-btn pc-btn-group-metadata" data-group-index="${group.originalIndex}" data-criteria="resolution" data-preference="larger" data-media-type="${mediaType}" ${!isSelectable ? 'disabled title="Upgrade to Pro to select items in this group"' : (!this.isPaidVersion ? 'disabled title="Upgrade to Pro for metadata-based selection"' : 'title="Keep higher resolution in this group"')}>
                                🖼️➕
                            </button>
                            <button class="pc-btn pc-btn-group-metadata" data-group-index="${group.originalIndex}" data-criteria="resolution" data-preference="smaller" data-media-type="${mediaType}" ${!isSelectable ? 'disabled title="Upgrade to Pro to select items in this group"' : (!this.isPaidVersion ? 'disabled title="Upgrade to Pro for metadata-based selection"' : 'title="Keep lower resolution in this group"')}>
                                🖼️➖
                            </button>
                            <button class="pc-btn pc-btn-group-metadata" data-group-index="${group.originalIndex}" data-criteria="taken_date" data-preference="newer" data-media-type="${mediaType}" ${!isSelectable ? 'disabled title="Upgrade to Pro to select items in this group"' : (!this.isPaidVersion ? 'disabled title="Upgrade to Pro for metadata-based selection"' : `title="Keep newer ${mediaType} (taken date) in this group"`)}>
                                📅➕
                            </button>
                            <button class="pc-btn pc-btn-group-metadata" data-group-index="${group.originalIndex}" data-criteria="taken_date" data-preference="older" data-media-type="${mediaType}" ${!isSelectable ? 'disabled title="Upgrade to Pro to select items in this group"' : (!this.isPaidVersion ? 'disabled title="Upgrade to Pro for metadata-based selection"' : `title="Keep older ${mediaType} (taken date) in this group"`)}>
                                📅➖
                            </button>
                            <button class="pc-btn pc-btn-group-metadata" data-group-index="${group.originalIndex}" data-criteria="upload_date" data-preference="newer" data-media-type="${mediaType}" ${!isSelectable ? 'disabled title="Upgrade to Pro to select items in this group"' : (!this.isPaidVersion ? 'disabled title="Upgrade to Pro for metadata-based selection"' : 'title="Keep newer upload in this group"')}>
                                ⬆️➕
                            </button>
                            <button class="pc-btn pc-btn-group-metadata" data-group-index="${group.originalIndex}" data-criteria="upload_date" data-preference="older" data-media-type="${mediaType}" ${!isSelectable ? 'disabled title="Upgrade to Pro to select items in this group"' : (!this.isPaidVersion ? 'disabled title="Upgrade to Pro for metadata-based selection"' : 'title="Keep older upload in this group"')}>
                                ⬆️➖
                            </button>
                        </div>
                    </div>
                    <div class="pc-group-images">
                        ${group.image_ids.map(id => {
                const mediaItem = mediaArray.find(item => item.id === id);
                if (!mediaItem) return '';
                // Convert thumbnail URL to full-size for display
                const fullSizeUrl = this.convertToFullResolution(mediaItem.url);

                return `
                                <div class="pc-image-item ${!isSelectable ? 'pc-image-non-selectable' : ''}" data-photo-id="${mediaItem.id}" data-photo-url="${mediaItem.url}" data-media-type="${mediaType}">
                                    <div class="pc-image-container">
                                        <img src="${fullSizeUrl}" alt="${mediaItem.ariaLabel}">
                                        <div class="pc-image-overlay ${!isSelectable ? 'pc-overlay-disabled' : ''}">
                                            <div class="pc-checkbox-indicator" data-selected="false">
                                                <svg width="24" height="24" viewBox="0 0 24 24" class="pc-checkbox-icon">
                                                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                                                    <path d="M7 13l3 3 7-7" stroke="currentColor" stroke-width="2" fill="none" style="display: none;"/>
                                                </svg>
                                            </div>
                                            <span class="pc-toggle-text">${!isSelectable ? `Upgrade to Pro to select ${mediaType}s in this group` : `Click to mark or unmark ${mediaType} for deletion`}</span>
                                        </div>
                                    </div>
                                    <p>${mediaType === 'video' ? '📹 ' : '📸 '}${mediaItem.ariaLabel}</p>
                                    <div class="pc-image-size" data-photo-id="${mediaItem.id}"></div>
                                    <a href="${mediaItem.href}" target="_blank">View in DupeYak Duplicate Remover</a>
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;
        }).join('');

        // Add upgrade message if there are non-selectable groups for free users
        if (!this.isPaidVersion && nonSelectableGroups > 0) {
            groupsHtml += `
                <div class="pc-upgrade-message" style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 16px 0; text-align: center;">
                    <p style="margin: 0 0 12px 0; color: #856404; font-weight: 500; font-size: 16px;">
                        📊 <strong>${nonSelectableGroups} additional ${mediaType} groups found!</strong> Free version allows ${mediaType} selection in the first 2 groups only. Upgrade to PRO to unlock ${mediaType} selection in all groups.
                    </p>
                    <button id="pc-upgrade-pro-btn-${mediaType}" class="pc-btn pc-btn-buy" style="
                        margin: 0 auto;
                        padding: 10px 20px;
                        background: #007bff;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-weight: 600;
                        font-size: 14px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: inline-block;
                    ">
                        🔥 Upgrade to PRO
                    </button>
                </div>
            `;
        }

        return groupsHtml;
    }

    async processBatchScreenshotsForFrontendVideos(sessionId, videoBatch, startIndex, layout) {
        const container = document.getElementById('pc-screenshot-container');
        if (!container) {
            throw new Error('Screenshot container not found');
        }

        // Clear previous screenshots
        container.innerHTML = '';

        // Create screenshot slots for this batch of videos
        const screenshotSlots = [];
        for (let i = 0; i < videoBatch.length; i++) {
            const video = videoBatch[i];
            const slot = this.createScreenshotSlot(video, startIndex + i, layout);
            container.appendChild(slot.element);
            screenshotSlots.push(slot);
        }

        // Start loading all video thumbnails simultaneously - handle failures gracefully
        const loadPromises = screenshotSlots.map(slot =>
            this.loadImageInSlot(slot).catch(error => {
                console.log(`⚠️ Skipping video thumbnail ${slot.photo.id}: ${error.message}`);
                slot.loadFailed = true;
                return null;
            })
        );
        await Promise.all(loadPromises);

        // Wait for all images to be fully rendered
        await this.delay(800);

        // Respect rate limiting before screenshot
        await this.respectScreenshotRateLimit();

        // Capture screenshot of the entire batch area
        const batchScreenshot = await this.captureBatchScreenshot();

        // Process each video thumbnail from the batch screenshot and compute hashes in frontend
        let uploaded = 0;
        for (let i = 0; i < screenshotSlots.length; i++) {
            const slot = screenshotSlots[i];
            const video = videoBatch[i];

            // Skip video thumbnails that failed to load
            if (slot.loadFailed) {
                console.log(`⏭️ Skipping failed video thumbnail ${startIndex + i + 1}: ${video.id}`);
                continue;
            }

            try {
                // Crop individual video thumbnail from batch screenshot
                const croppedImage = await this.cropImageFromBatch(batchScreenshot, slot.bounds);

                if (croppedImage) {
                    console.log(`🎬 Frontend processing video thumbnail ${startIndex + i + 1}: ${video.id}`);

                    // Store captured image data for AI selection
                    video.capturedImageData = croppedImage;
                    console.log(`💾 Stored captured video thumbnail data for video ${video.id} (for AI selection)`);

                    // Add to frontend session (compute hashes) - treating video thumbnail as image
                    const result = await this.frontendSessionManager.addImage(sessionId, video.id, croppedImage);

                    if (result.success) {
                        uploaded++;
                        console.log(`✅ Frontend processed video thumbnail ${startIndex + i + 1}: ${video.ariaLabel}`);
                    } else {
                        console.warn(`❌ Frontend failed to process video thumbnail ${startIndex + i + 1}: ${result.error}`);
                    }
                } else {
                    console.warn(`❌ Failed to crop video thumbnail ${startIndex + i + 1}: ${video.id}`);
                }
            } catch (error) {
                console.warn(`❌ Failed to process video thumbnail ${startIndex + i + 1}: ${video.id}`, error);
            }
        }

        return uploaded;
    }

    calculateOptimalBatchLayout() {
        const devicePixelRatio = window.devicePixelRatio || 1;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Target size for final images (always 400x400)
        const targetImageSize = 400;

        // Actual slot size considering device pixel ratio
        // If devicePixelRatio is 2, we can capture at 200x200 but get 400x400 quality
        const slotSize = Math.round(targetImageSize / devicePixelRatio);
        const slotSpacing = 20;
        const marginX = 50; // Left margin
        const marginY = 100; // Minimum top margin (you requested min 100px)

        // Calculate how many images can fit horizontally
        const availableWidth = viewportWidth - (marginX * 2);
        const maxImagesPerRow = Math.floor((availableWidth + slotSpacing) / (slotSize + slotSpacing));

        // Calculate how many rows can fit vertically
        const availableHeight = viewportHeight - marginY - 50; // 50px bottom margin
        const maxRows = Math.floor((availableHeight + slotSpacing) / (slotSize + slotSpacing));

        // Total images per batch
        const maxImagesPerBatch = Math.max(1, maxImagesPerRow * maxRows);

        // Calculate actual screenshot area dimensions
        const actualImagesPerRow = Math.min(maxImagesPerRow, maxImagesPerBatch);
        const actualRows = Math.ceil(maxImagesPerBatch / actualImagesPerRow);

        const screenshotWidth = (actualImagesPerRow * slotSize) + ((actualImagesPerRow - 1) * slotSpacing) + (marginX * 2);
        const screenshotHeight = (actualRows * slotSize) + ((actualRows - 1) * slotSpacing) + marginY + 50;

        console.log(`📐 Optimal batch layout calculation:`, {
            devicePixelRatio: devicePixelRatio,
            viewportSize: `${viewportWidth}x${viewportHeight}`,
            targetImageSize: targetImageSize,
            slotSize: slotSize,
            maxImagesPerRow: maxImagesPerRow,
            maxRows: maxRows,
            maxImagesPerBatch: maxImagesPerBatch,
            screenshotDimensions: `${screenshotWidth}x${screenshotHeight}`,
            note: `Using ${slotSize}x${slotSize} slots to capture ${targetImageSize}x${targetImageSize} final images`
        });

        return {
            batchSize: maxImagesPerBatch,
            slotSize: slotSize,
            targetImageSize: targetImageSize,
            imagesPerRow: actualImagesPerRow,
            rows: actualRows,
            spacing: slotSpacing,
            marginX: marginX,
            marginY: marginY,
            screenshotWidth: screenshotWidth,
            screenshotHeight: screenshotHeight,
            devicePixelRatio: devicePixelRatio
        };
    }

    // Legacy server upload method - replaced by uploadPhotosToFrontendSession
    /*
    async uploadPhotosToSession(sessionId) {
        console.log(`Uploading ${this.photos.length} photos to session using optimized batch screenshot method`);
        // ... legacy server upload code ...
    }
    */

    showScreenshotArea(layout) {
        // Show window warning during screenshot phase
        // this.showWindowWarning(true);
    //  this.closePanel()
        this.closeInitialPopup()
        const screenshotArea = document.getElementById('pc-screenshot-area');
        if (screenshotArea) {
            // Use dynamic layout instead of fixed dimensions
            const SCREENSHOT_X = layout.marginX;
            const SCREENSHOT_Y = layout.marginY;
            const SCREENSHOT_WIDTH = layout.screenshotWidth;
            const SCREENSHOT_HEIGHT = layout.screenshotHeight;

            // Force clear any existing positioning that might interfere
            screenshotArea.style.right = '';
            screenshotArea.style.transform = '';
            screenshotArea.style.margin = '';
            screenshotArea.style.marginLeft = '';
            screenshotArea.style.marginRight = '';

            screenshotArea.style.display = 'block';
            screenshotArea.style.position = 'fixed';
            screenshotArea.style.left = `${SCREENSHOT_X}px`;
            screenshotArea.style.top = `${SCREENSHOT_Y}px`;

            // Force left positioning with !important by setting via cssText
            const leftStyle = `left: ${SCREENSHOT_X}px `;
            const existingStyle = screenshotArea.style.cssText;
            screenshotArea.style.cssText = existingStyle + '; ' + leftStyle;
            screenshotArea.style.width = `${SCREENSHOT_WIDTH}px`;
            screenshotArea.style.height = `${SCREENSHOT_HEIGHT}px`;
            screenshotArea.style.zIndex = '10005'; // Higher than all other elements to ensure it's on top
            screenshotArea.style.background = 'rgba(255, 255, 255, 0.95)';
            // Removed border to eliminate offset calculation issues
            screenshotArea.style.border = 'none';
            screenshotArea.style.borderRadius = '0px';
            screenshotArea.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';

            // Store fixed coordinates for cropping calculations
            this.screenshotAreaBounds = {
                x: SCREENSHOT_X,
                y: SCREENSHOT_Y,
                width: SCREENSHOT_WIDTH,
                height: SCREENSHOT_HEIGHT
            };

            console.log(`📏 Screenshot area bounds (FIXED LEFT):`, {
                x: SCREENSHOT_X,
                y: SCREENSHOT_Y,
                width: SCREENSHOT_WIDTH,
                height: SCREENSHOT_HEIGHT,
                calculation: `Area: LEFT ${SCREENSHOT_X}px, TOP ${SCREENSHOT_Y}px, ${SCREENSHOT_WIDTH}x${SCREENSHOT_HEIGHT}`,
                note: "Screenshot area MUST be positioned on LEFT side at fixed coordinates"
            });

            // Double-check actual position after setting
            setTimeout(() => {
                const actualRect = screenshotArea.getBoundingClientRect();
                console.log(`📏 Screenshot area ACTUAL position:`, {
                    actualX: actualRect.x,
                    actualY: actualRect.y,
                    actualWidth: actualRect.width,
                    actualHeight: actualRect.height,
                    expectedX: SCREENSHOT_X,
                    expectedY: SCREENSHOT_Y,
                    leftOffset: actualRect.x - SCREENSHOT_X,
                    yOffset: actualRect.y - SCREENSHOT_Y,
                    warning: actualRect.x !== SCREENSHOT_X ? "⚠️ X position mismatch!" : "✅ X position correct",
                    note: "Verifying LEFT side positioning"
                });
            }, 100);
        }
    }

    hideScreenshotArea() {
        // Hide window warning when screenshot phase ends
        this.showWindowWarning(false);

        const screenshotArea = document.getElementById('pc-screenshot-area');
        if (screenshotArea) {
            screenshotArea.style.display = 'none';
        }
    }

    async processBatchScreenshots(sessionId, photoBatch, startIndex, layout) {
        const container = document.getElementById('pc-screenshot-container');
        if (!container) {
            throw new Error('Screenshot container not found');
        }

        // Clear previous screenshots
        container.innerHTML = '';

        // Create screenshot slots for this batch
        const screenshotSlots = [];
        for (let i = 0; i < photoBatch.length; i++) {
            const photo = photoBatch[i];
            const slot = this.createScreenshotSlot(photo, startIndex + i, layout);
            container.appendChild(slot.element);
            screenshotSlots.push(slot);
        }

        // Start loading all images simultaneously - handle failures gracefully
        const loadPromises = screenshotSlots.map(slot =>
            this.loadImageInSlot(slot).catch(error => {
                console.log(`⚠️ Skipping image ${slot.photo.id}: ${error.message}`);
                // Mark slot as failed but don't reject the entire batch
                slot.loadFailed = true;
                return null; // Return null instead of rejecting
            })
        );
        await Promise.all(loadPromises);

        // Wait for all images to be fully rendered
        await this.delay(800); // Give time for rendering

        // Respect rate limiting before screenshot
        await this.respectScreenshotRateLimit();

        // Capture screenshot of the entire batch area
        const batchScreenshot = await this.captureBatchScreenshot();

        // Process each image from the batch screenshot
        let uploaded = 0;
        for (let i = 0; i < screenshotSlots.length; i++) {
            const slot = screenshotSlots[i];
            const photo = photoBatch[i];

            // Skip images that failed to load
            if (slot.loadFailed) {
                console.log(`⏭️ Skipping failed image ${startIndex + i + 1}: ${photo.id}`);
                continue;
            }

            try {
                // Crop individual image from batch screenshot
                const croppedImage = await this.cropImageFromBatch(batchScreenshot, slot.bounds);

                if (croppedImage) {
                    // Log image details for debugging
                    console.log(`🖼️ Image ${startIndex + i + 1} details:`, {
                        id: photo.id,
                        ariaLabel: photo.ariaLabel,
                        originalUrl: photo.src,
                        croppedImageSize: croppedImage.length,
                        croppedImageType: croppedImage.substring(5, 15) // "data:image/jpeg" part
                    });

                    // DEBUG: Add option to save image locally for inspection

                    this.debugSaveImage(croppedImage, `debug_image_${startIndex + i + 1}_${photo.id}`);


                    // Upload to session
                    await this.uploadImageToSession(sessionId, photo.id, croppedImage);
                    uploaded++;
                    console.log(`✅ Uploaded image ${startIndex + i + 1}: ${photo.ariaLabel}`);
                } else {
                    console.warn(`❌ Failed to crop image ${startIndex + i + 1}: ${photo.id}`);
                }
            } catch (error) {
                console.warn(`❌ Failed to process image ${startIndex + i + 1}: ${photo.id}`, error);
            }
        }

        return uploaded;
    }

    createScreenshotSlot(photo, index, layout) {
        const slotId = `screenshot-slot-${index}`;
        const slot = document.createElement('div');
        slot.id = slotId;
        slot.className = 'pc-screenshot-slot';

        // Use dynamic layout dimensions
        const slotSize = layout.slotSize; // Scaled based on device pixel ratio
        const targetImageSize = layout.targetImageSize; // Always 400x400 for final output
        const spacing = layout.spacing;
        const startX = 10; // Fixed margin from left edge of screenshot area
        const startY = 10; // Fixed margin from top edge of screenshot area

        // Calculate position in grid
        const positionInBatch = index % layout.batchSize;
        const row = Math.floor(positionInBatch / layout.imagesPerRow);
        const col = positionInBatch % layout.imagesPerRow;

        const left = startX + col * (slotSize + spacing);
        const top = startY + row * (slotSize + spacing);

        slot.style.position = 'absolute';
        slot.style.left = `${left}px`;
        slot.style.top = `${top}px`;
        slot.style.width = `${slotSize}px`;
        slot.style.height = `${slotSize}px`;
        slot.style.overflow = 'hidden';
        // Removed all visual styling (border, borderRadius, backgroundColor, boxShadow) to prevent capturing borders

        // Add minimal loading indicator (will be replaced by actual image) - no styling to avoid capture
        slot.innerHTML = `<div class="pc-loading-indicator">Loading ${index + 1}...</div>`;

        // Calculate absolute screen coordinates for cropping (no border offset needed)
        const absoluteX = (this.screenshotAreaBounds?.x || layout.marginX) + left;
        const absoluteY = (this.screenshotAreaBounds?.y || layout.marginY) + top;

        console.log(`📐 Slot ${index + 1} positioning (borderless):`, {
            positionInBatch: positionInBatch,
            gridPosition: `row ${row}, col ${col}`,
            relativePosition: `${left}x${top}`,
            absolutePosition: `${absoluteX}x${absoluteY}`,
            slotSize: `${slotSize}x${slotSize}`,
            targetSize: `${targetImageSize}x${targetImageSize}`,
            devicePixelRatio: layout.devicePixelRatio,
            note: `Borderless: ${slotSize}x${slotSize} slot → ${targetImageSize}x${targetImageSize} final image`
        });

        return {
            element: slot,
            photo: photo,
            bounds: {
                x: left,        // Relative to screenshot area
                y: top,         // Relative to screenshot area
                absoluteX: absoluteX,  // Absolute screen coordinates
                absoluteY: absoluteY,  // Absolute screen coordinates
                width: slotSize,       // CSS slot size (scaled by device pixel ratio)
                height: slotSize,
                cropWidth: targetImageSize,   // Final crop size (always 400x400)
                cropHeight: targetImageSize,
                borderOffset: 0,  // No border offset needed since we removed borders
                devicePixelRatio: layout.devicePixelRatio
            },
            slotId: slotId
        };
    }

    async loadImageInSlot(slot) {
        return new Promise((resolve, reject) => {
            try {
                // Extract URL for this photo
                const fullResUrl = this.getFullResolutionUrl(slot.photo.element);
                if (!fullResUrl) {
                    // Just fail silently - no visual placeholder
                    reject(new Error(`Could not extract URL for ${slot.photo.id}`));
                    return;
                }

                // Create image element
                const img = document.createElement('img');
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.display = 'block';

                img.onload = () => {
                    // Replace loading indicator with actual image
                    slot.element.innerHTML = '';
                    slot.element.appendChild(img);
                    resolve();
                };

                img.onerror = () => {
                    // Just fail silently - no visual placeholder
                    reject(new Error(`Failed to load image for ${slot.photo.id}`));
                };

                // Start loading
                img.src = fullResUrl;

            } catch (error) {
                // Just fail silently - no visual placeholder
                reject(error);
            }
        });
    }

    async captureBatchScreenshot() {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'capturePhoto',
                photoId: 'batch-screenshot'
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error('Batch screenshot failed: ' + chrome.runtime.lastError.message));
                    return;
                }

                if (response && response.success && response.imageData) {
                    resolve(response.imageData);
                } else {
                    reject(new Error('Batch screenshot failed: ' + (response?.error || 'Unknown error')));
                }
            });
        });
    }

    async cropImageFromBatch(batchScreenshotDataUrl, bounds) {
        try {
            // Create canvas for cropping - always output 400x400 regardless of input size
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Set canvas size to target size (always 400x400)
            canvas.width = bounds.cropWidth || 400;
            canvas.height = bounds.cropHeight || 400;

            // Load the batch screenshot
            const img = new Image();

            return new Promise((resolve, reject) => {
                img.onload = () => {
                    try {
                        // Calculate scaling factor between screenshot and viewport
                        const viewportWidth = window.innerWidth;
                        const viewportHeight = window.innerHeight;
                        const scaleX = img.width / viewportWidth;
                        const scaleY = img.height / viewportHeight;

                        // Use the larger scale factor to ensure we don't crop outside the image
                        const scaleFactor = Math.max(scaleX, scaleY);

                        // Calculate base coordinates (no border offset needed since we removed all styling)
                        const baseCropX = bounds.absoluteX || ((this.screenshotAreaBounds?.x || 50) + bounds.x);
                        const baseCropY = bounds.absoluteY || ((this.screenshotAreaBounds?.y || 100) + bounds.y);

                        // Apply scaling factor to coordinates
                        const scaledCropX = Math.round(baseCropX * scaleFactor);
                        const scaledCropY = Math.round(baseCropY * scaleFactor);

                        // Use the actual slot size (no border offset needed)
                        const sourceSlotSize = bounds.width;
                        const scaledSourceWidth = Math.round(sourceSlotSize * scaleFactor);
                        const scaledSourceHeight = Math.round(sourceSlotSize * scaleFactor);

                        console.log(`📐 Clean scaling calculation:`, {
                            viewportSize: `${viewportWidth}x${viewportHeight}`,
                            screenshotSize: `${img.width}x${img.height}`,
                            devicePixelRatio: bounds.devicePixelRatio || 1,
                            scaleX: scaleX,
                            scaleY: scaleY,
                            scaleFactor: scaleFactor,
                            slotSize: `${bounds.width}x${bounds.height}`,
                            sourceSlotSize: sourceSlotSize,
                            targetSize: `${bounds.cropWidth}x${bounds.cropHeight}`,
                            baseCoords: `(${baseCropX}, ${baseCropY})`,
                            scaledCoords: `(${scaledCropX}, ${scaledCropY})`,
                            scaledSourceDimensions: `${scaledSourceWidth}x${scaledSourceHeight}`,
                            note: `Clean capture: ${sourceSlotSize}x${sourceSlotSize} slot → ${bounds.cropWidth}x${bounds.cropHeight} final image`
                        });

                        console.log(`✂️ CLEAN Crop at (${scaledCropX}, ${scaledCropY}) size ${scaledSourceWidth}x${scaledSourceHeight} from ${img.width}x${img.height} source`);

                        // Crop from batch screenshot using scaled coordinates
                        // The magic happens here: we crop the smaller slot but output to 400x400 canvas
                        // This gives us the quality benefit of device pixel ratio
                        ctx.drawImage(
                            img,
                            scaledCropX, scaledCropY, scaledSourceWidth, scaledSourceHeight,  // Source coordinates (scaled slot size)
                            0, 0, bounds.cropWidth || 400, bounds.cropHeight || 400  // Destination coordinates (always 400x400)
                        );

                        // Convert to data URL
                        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

                        console.log(`✅ Clean cropped image: ${sourceSlotSize}x${sourceSlotSize} slot → ${bounds.cropWidth}x${bounds.cropHeight} final (${croppedDataUrl.length} chars)`);
                        resolve(croppedDataUrl);
                    } catch (error) {
                        console.error('❌ Error during clean cropping:', error);
                        reject(error);
                    }
                };

                img.onerror = () => {
                    console.error('❌ Failed to load batch screenshot for cropping');
                    reject(new Error('Failed to load batch screenshot'));
                };

                img.src = batchScreenshotDataUrl;
            });

        } catch (error) {
            console.error('Error cropping image from batch:', error);
            return null;
        }
    }

    async uploadImageToSession(sessionId, imageId, base64Data) {
        // Store the captured image data in the appropriate array for face detection
        let mediaItem = this.photos.find(p => p.id === imageId);
        let mediaType = 'photo';

        if (!mediaItem) {
            mediaItem = this.videos.find(v => v.id === imageId);
            mediaType = 'video';
        }

        if (mediaItem) {
            mediaItem.capturedImageData = base64Data;
            console.log(`💾 Stored captured image data for ${mediaType} ${imageId} (${base64Data.length} chars)`);
        }

        // Convert base64 to blob for file upload
        const blob = await this.base64ToBlob(base64Data, 'image/jpeg');

        // Log upload details for debugging
        console.log(`📤 Uploading image ${imageId}:`, {
            blobSize: blob.size,
            blobType: blob.type,
            sessionId: sessionId,
            base64Length: base64Data.length
        });

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('image', blob, `${imageId}.jpg`);
        formData.append('image_id', imageId);

        const response = await fetch(`${this.serverUrl}/session/${sessionId}/add-image`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Failed to upload image ${imageId}: ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            console.error(`❌ Upload failed for ${imageId}:`, result.error);
            throw new Error(result.error || `Failed to upload image ${imageId}`);
        }

        console.log(`✅ Upload successful for ${imageId}:`, result.message);
        return result;
    }

    async base64ToBlob(base64Data, mimeType) {
        // Remove data URL prefix if present
        const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

        // Convert base64 to binary
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return new Blob([bytes], { type: mimeType });
    }

    async finalizeSession(sessionId) {
        this.updateProgress(85, 'Finalizing session and starting analysis...');

        console.log(`📊 Finalizing session with ${this.similarityThreshold || 85}% similarity threshold`);

        const response = await fetch(`${this.serverUrl}/session/${sessionId}/finalize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                similarity_threshold: this.similarityThreshold || 85
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to finalize session: ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to finalize session');
        }

        console.log(`✅ Session finalized with ${result.similarity_threshold || this.similarityThreshold || 85}% similarity threshold`);
        return result;
    }

    async waitForAnalysisCompletion(sessionId) {
        const maxWaitTime = 5 * 60 * 1000; // 5 minutes
        const startTime = Date.now();
        const pollInterval = 2000; // 2 seconds

        while (Date.now() - startTime < maxWaitTime) {
            const response = await fetch(`${this.serverUrl}/session/${sessionId}/status`);

            if (!response.ok) {
                throw new Error(`Failed to get session status: ${response.status}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to get session status');
            }

            const status = result.status;
            ////console.log('Session status:', status.analysis_status, `${status.analysis_progress || 0}%`);

            if (status.analysis_status === 'pending') {
                this.updateProgress(87, 'Starting similarity analysis...');
            } else if (status.analysis_status === 'analyzing') {
                // Update progress based on server progress
                if (status.analysis_progress) {
                    this.updateProgress(
                        87 + (status.analysis_progress * 0.13), // 87% to 100%
                        `Analyzing similarities: ${status.analysis_progress.toFixed(4)}% (${status.processed_images}/${status.total_images} comparisons)`
                    );
                } else {
                    this.updateProgress(87, 'Analyzing photo similarities...');
                }
            } else if (status.analysis_status === 'completed') {
                // Return results in the expected format
                return {
                    success: true,
                    total_images: status.total_images,
                    comparisons: status.total_comparisons,
                    similar_groups: status.similar_groups
                };
            } else if (status.analysis_status === 'error') {
                throw new Error(status.error || 'Analysis failed on server');
            }

            // Wait before next poll
            await this.delay(pollInterval);
        }

        throw new Error('Analysis timeout - server took too long to complete');
    }

    async captureImageWithTempElement(imageUrl, photoId) {
        return new Promise((resolve, reject) => {
            console.log(`Creating temporary image element for: ${photoId}`);

            // Create temporary container div
            const container = document.createElement('div');
            container.id = `temp-photo-${photoId}`;
            container.style.position = 'fixed';
            container.style.top = '50px';
            container.style.left = '50px';
            container.style.width = '400px';
            container.style.height = '400px';
            container.style.zIndex = '999999';
            container.style.backgroundColor = 'white';
            container.style.border = '2px solid #333';
            container.style.borderRadius = '8px';
            container.style.overflow = 'hidden';
            container.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';

            // Create image element
            const img = document.createElement('img');
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.display = 'block';

            let timeoutId;

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                if (container.parentNode) {
                    document.body.removeChild(container);
                }
            };

            // Set timeout to prevent hanging
            timeoutId = setTimeout(() => {
                console.error(`Timeout loading image: ${photoId}`);
                cleanup();
                reject(new Error('Image load timeout'));
            }, 10000);

            img.onload = async () => {
                try {
                    console.log(`Image loaded, ensuring full render: ${photoId}`);

                    // Wait for image to be fully rendered and painted
                    // High-resolution images need more time than the onload event provides
                    await this.waitForImageFullRender(img, container);

                    // Respect rate limiting before screenshot
                    await this.respectScreenshotRateLimit();

                    // Send message to background script to capture screenshot
                    chrome.runtime.sendMessage({
                        action: 'capturePhoto',
                        elementId: container.id,
                        photoId: photoId
                    }, (response) => {
                        cleanup();

                        if (chrome.runtime.lastError) {
                            console.error('Screenshot capture failed:', chrome.runtime.lastError);
                            reject(new Error('Screenshot capture failed'));
                            return;
                        }

                        if (response && response.success && response.imageData) {
                            console.log(`Successfully captured temp image: ${response.width}x${response.height}px`);
                            resolve(response.imageData);
                        } else {
                            console.error('Screenshot response error:', response?.error || 'Unknown error');
                            reject(new Error(response?.error || 'Screenshot capture failed'));
                        }
                    });

                } catch (err) {
                    cleanup();
                    reject(err);
                }
            };

            img.onerror = () => {
                console.error(`Failed to load image: ${photoId}`);
                cleanup();
                reject(new Error('Image load failed'));
            };

            // Add elements to DOM
            container.appendChild(img);
            document.body.appendChild(container);

            // Start loading image
            img.src = imageUrl;
        });
    }

    async waitForImageFullRender(img, container) {
        // Multiple strategies to ensure full rendering of high-resolution images

        console.log(`Waiting for full render of image: ${img.naturalWidth}x${img.naturalHeight}px`);

        // Strategy 1: Wait for paint events using requestAnimationFrame
        await new Promise(resolve => {
            let frameCount = 0;
            const waitForFrames = () => {
                frameCount++;
                if (frameCount >= 3) { // Wait for 3 animation frames
                    resolve();
                } else {
                    requestAnimationFrame(waitForFrames);
                }
            };
            requestAnimationFrame(waitForFrames);
        });

        // Strategy 2: Additional time based on image size
        // Larger images need more processing time
        const imageSize = img.naturalWidth * img.naturalHeight;
        const sizeBasedDelay = Math.min(Math.max(imageSize / 1000000 * 200, 300), 1500); // 300ms to 1.5s

        console.log(`Size-based delay: ${sizeBasedDelay}ms for ${imageSize} pixels`);
        await this.delay(sizeBasedDelay);

        // Strategy 3: Check if image is actually visible and rendered
        await this.waitForImageVisible(img, container);

        console.log(`✅ Image fully rendered and ready for screenshot`);
    }

    async waitForImageVisible(img, container) {
        // Ensure the image is actually visible and rendered in the viewport
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            const containerRect = container.getBoundingClientRect();
            const imgRect = img.getBoundingClientRect();

            // Check if image has proper dimensions and is visible
            if (imgRect.width > 100 && imgRect.height > 100 &&
                containerRect.width > 100 && containerRect.height > 100) {

                // Check if image is actually loaded by examining computed style
                const computedStyle = window.getComputedStyle(img);
                if (computedStyle.opacity !== '0' && computedStyle.visibility !== 'hidden') {
                    console.log(`✅ Image is visible: ${imgRect.width}x${imgRect.height}px`);
                    return;
                }
            }

            console.log(`⏳ Waiting for image visibility, attempt ${attempts + 1}/${maxAttempts}`);
            await this.delay(100);
            attempts++;
        }

        console.warn(`⚠️  Image visibility check timed out after ${maxAttempts} attempts`);
    }

    async respectScreenshotRateLimit() {
        const now = Date.now();
        const timeSinceLastScreenshot = now - this.lastScreenshotTime;
        const minInterval = 600; // 600ms = 1.67 screenshots per second (under 2/sec limit)

        if (timeSinceLastScreenshot < minInterval) {
            const waitTime = minInterval - timeSinceLastScreenshot;
            console.log(`⏳ Rate limiting: waiting ${waitTime}ms before screenshot...`);
            await this.delay(waitTime);
        }

        this.lastScreenshotTime = Date.now();
    }

    getFullResolutionUrl(bgElement) {
        try {
            if (!bgElement) {
                console.warn('🔍 getFullResolutionUrl: bgElement is null/undefined');
                return null;
            }

            //console.log('🔍 getFullResolutionUrl: Starting URL extraction for element:', bgElement.tagName);

            // Find the element with the background image
            const bgElements = bgElement.querySelectorAll('*[style*="background-image"], *[data-latest-bg]');
            console.log(`🔍 Found ${bgElements.length} potential background image elements`);

            for (let i = 0; i < bgElements.length; i++) {
                const element = bgElements[i];
                console.log(`🔍 Checking element ${i + 1}/${bgElements.length}:`, element.tagName);

                // Try data-latest-bg first
                const dataLatestBg = element.getAttribute('data-latest-bg');
                if (dataLatestBg && dataLatestBg.trim() !== '') {
                    //console.log('✓ Found data-latest-bg URL:', dataLatestBg.substring(0, 100) + '...');
                    return this.convertToFullResolution(dataLatestBg);
                }

                // Try background-image from style
                const style = element.getAttribute('style');
                if (style) {
                    //console.log('🔍 Checking style attribute:', style.substring(0, 150) + '...');

                    const patterns = [
                        /background-image:\s*url\(&quot;([^&"]+)&quot;\)/,
                        /background-image:\s*url\("([^"]+)"\)/,
                        /background-image:\s*url\('([^']+)'\)/,
                        /background-image:\s*url\(([^)]+)\)/
                    ];

                    for (let j = 0; j < patterns.length; j++) {
                        const pattern = patterns[j];
                        const urlMatch = style.match(pattern);
                        if (urlMatch && urlMatch[1] && urlMatch[1].trim() !== '') {
                            const imageUrl = urlMatch[1].trim();
                            console.log(`✓ Pattern ${j + 1} matched, found URL:`, imageUrl.substring(0, 100) + '...');

                            if (imageUrl !== 'none' && imageUrl.length > 5) {
                                // Get the first (highest resolution) URL if multiple URLs
                                const firstUrl = imageUrl.split(',')[0].trim();
                                //console.log('✓ Using first URL from list:', firstUrl.substring(0, 100) + '...');
                                return this.convertToFullResolution(firstUrl);
                            } else {
                                //console.log('❌ URL too short or is "none":', imageUrl);
                            }
                        }
                    }
                    //console.log('❌ No background-image URL patterns matched in style');
                } else {
                    //console.log('❌ Element has no style attribute');
                }
            }

            // Also check the element itself for background image
            const elementStyle = bgElement.getAttribute('style');
            if (elementStyle && elementStyle.includes('background-image')) {
                //console.log('🔍 Checking main element style:', elementStyle.substring(0, 150) + '...');
                // Apply same pattern matching to main element
                const patterns = [
                    /background-image:\s*url\(&quot;([^&"]+)&quot;\)/,
                    /background-image:\s*url\("([^"]+)"\)/,
                    /background-image:\s*url\('([^']+)'\)/,
                    /background-image:\s*url\(([^)]+)\)/
                ];

                for (let j = 0; j < patterns.length; j++) {
                    const pattern = patterns[j];
                    const urlMatch = elementStyle.match(pattern);
                    if (urlMatch && urlMatch[1] && urlMatch[1].trim() !== '') {
                        const imageUrl = urlMatch[1].trim();
                        console.log(`✓ Main element pattern ${j + 1} matched:`, imageUrl.substring(0, 100) + '...');

                        if (imageUrl !== 'none' && imageUrl.length > 5) {
                            const firstUrl = imageUrl.split(',')[0].trim();
                            return this.convertToFullResolution(firstUrl);
                        }
                    }
                }
            }

            //console.log('❌ No background image URL found in any element');
            return null;

        } catch (error) {
            console.error('❌ Error extracting full resolution URL:', error);
            return null;
        }
    }

    convertToFullResolution(thumbnailUrl) {
        try {
            // Convert thumbnail URL to full resolution
            // From: https://photos.fife.usercontent.google.com/pw/...=w256-h192-no?authuser=0
            // To:   https://photos.fife.usercontent.google.com/pw/...=w1200-h1200-no?authuser=0

            // Extract base URL (everything before the =w part)
            const baseUrlMatch = thumbnailUrl.match(/^(.+)=w\d+-h\d+(-[^?]+)?(\?.*)?$/);
            if (baseUrlMatch) {
                const baseUrl = baseUrlMatch[1];
                const suffix = baseUrlMatch[2] || '-no'; // Keep the suffix (like -no, -k-rw-no)
                const queryParams = baseUrlMatch[3] || '';

                // Use a good resolution for comparison (not too large to avoid memory issues)
                const fullResUrl = `${baseUrl}=w1200-h1200${suffix}${queryParams}`;

                console.log(`Converted thumbnail to full-res: ${thumbnailUrl.substring(0, 80)}... -> ${fullResUrl.substring(0, 80)}...`);
                return fullResUrl;
            }

            // If pattern doesn't match, return original URL
            console.warn('Could not convert URL to full resolution, using original:', thumbnailUrl.substring(0, 100));
            return thumbnailUrl;

        } catch (error) {
            console.error('Error converting to full resolution:', error);
            return thumbnailUrl;
        }
    }

    async captureElementBackgroundToCanvas(element) {
        try {
            // Get element's dimensions and computed style
            const rect = element.getBoundingClientRect();

            // Skip if element is too small or not visible
            if (rect.width < 10 || rect.height < 10) {
                return null;
            }

            // Try using OffscreenCanvas or html2canvas approach
            // This captures the already-rendered element without additional network requests
            return await this.captureRenderedElement(element, rect);

        } catch (error) {
            console.error('Error capturing element background:', error);
            return null;
        }
    }

    async captureRenderedElement(element, rect) {
        try {
            // Create canvas with appropriate size
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Set reasonable canvas size (limit for performance)
            const maxSize = 300;
            const scale = Math.min(maxSize / rect.width, maxSize / rect.height, 1);
            canvas.width = rect.width * scale;
            canvas.height = rect.height * scale;

            // Try to use modern browser APIs to capture the element
            if ('html2canvas' in window) {
                // If html2canvas library is available, use it
                const canvasElement = await html2canvas(element, {
                    width: canvas.width,
                    height: canvas.height,
                    scale: scale,
                    useCORS: true,
                    allowTaint: false
                });
                return canvasElement.toDataURL('image/jpeg', 0.8);
            }

            // Fallback: try to clone and render the element
            return await this.fallbackElementCapture(element, canvas, ctx, scale);

        } catch (error) {
            console.error('Error capturing rendered element:', error);
            return null;
        }
    }

    async fallbackElementCapture(element, canvas, ctx, scale) {
        try {
            // Create a unique identifier based on the element's properties instead of actual image
            // This allows duplicate detection without network requests
            //console.log('Creating photo fingerprint without network requests');

            // Get element properties for unique identification
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            const backgroundImage = style.backgroundImage;

            // Extract URL hash if available
            let urlHash = '';
            if (backgroundImage && backgroundImage !== 'none') {
                const urlMatch = backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);
                if (urlMatch) {
                    // Create a simple hash from the URL
                    urlHash = this.simpleHash(urlMatch[1]);
                }
            }

            // Create visual fingerprint based on element properties
            const fingerprint = {
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                urlHash: urlHash,
                backgroundSize: style.backgroundSize,
                backgroundPosition: style.backgroundPosition
            };

            // Create a visual representation of the fingerprint
            ctx.fillStyle = `hsl(${urlHash % 360}, 70%, 80%)`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Add pattern based on fingerprint
            ctx.fillStyle = `hsl(${urlHash % 360}, 90%, 60%)`;
            const patternSize = 20;
            for (let x = 0; x < canvas.width; x += patternSize) {
                for (let y = 0; y < canvas.height; y += patternSize) {
                    if ((x + y) % (patternSize * 2) === 0) {
                        ctx.fillRect(x, y, patternSize / 2, patternSize / 2);
                    }
                }
            }

            // Add text identifier
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${fingerprint.width}x${fingerprint.height}`, canvas.width / 2, canvas.height / 2);
            ctx.fillText(`#${urlHash.toString().slice(0, 6)}`, canvas.width / 2, canvas.height / 2 + 15);

            return canvas.toDataURL('image/jpeg', 0.8);

        } catch (error) {
            console.error('Error in fallback capture:', error);
            return null;
        }
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    // Old screenshot methods removed - now using temporary image element approach

    getTempElementInfo(elementId) {
        // Find the temporary element by ID and return its position
        const element = document.getElementById(elementId);
        if (element) {
            const rect = element.getBoundingClientRect();
            return {
                x: Math.round(rect.left),
                y: Math.round(rect.top),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                found: true
            };
        }
        return null;
    }



    showResults(results) {
        if (!results.success) {
            alert('Analysis failed: ' + (results.error || 'Unknown error'));
            return;
        }

        // Update the photo count display with the processed count from analysis
        this.processedPhotosCount = results.total_images || this.photos.length;
        this.restorePhotoCountDisplay();

        // Store results in extension storage for popup to access
        chrome.storage.local.set({
            analysisResults: results,
            photos: this.photos,
            timestamp: Date.now()
        });

        // Show results in a new tab or overlay
        this.createResultsOverlay(results);
    }

    createResultsOverlay(results) {
        // Remove existing overlay
        const existingOverlay =  $('#pc-results-overlay');
        if (existingOverlay.length) {
            this.cleanupViewportObserver();
            existingOverlay.remove();
        }

        const overlay = $('<div>', { id: 'pc-results-overlay' });
        const premiumIconUrl = chrome.runtime.getURL('../icons/icon/premium.svg');
        const lockIconUrl = chrome.runtime.getURL('../icons/icon/lock.svg');
        const cameraIconUrl = chrome.runtime.getURL('../icons/icon/camera.svg');
        const logo_IconUrl = chrome.runtime.getURL('../icons/logo.png');
        const d_imageIconUrl = chrome.runtime.getURL('../icons/d-image.jpg');
         overlay.html ( `
               <header class="header">  
        <div class="container mx-auto px-3 max-[767px]:px-2 py-4">
           <div class="row">
              <div class="flex items-center justify-between">
                  <div class="headerlogo">
                    <a href="#" class="flex items-center gap-[5px] font-bold dark-color">
                        <span class="flex w-[65px] max-[1600px]:w-[55px] max-[767px]:w-[45px] items-center justify-center"><img class="logo_-img" alt="logo"></span>
                        <span class="flex">DupeYak Duplicate Remover Duplicate Remover 
                            <span class="w-[30px] pl-2 premium-icon"><img alt="" ></span>
                        </span>                                               
                    </a>
                    </div>
                    <div class="headermenu">
                        <div id="extension-version" class="version">
                            <p class="font-semibold	 dec-color">v1.4.1</p>
                        </div>
                    </div>
              </div>
           </div>
        </div>
    </header>

    <section class="max-[767px]:py-12 banner-section bg-gradient max-[1600px]:rounded-[30px]">
        <div class="container mx-auto px-3 max-[767px]:px-2">
            <div class="row">
                <!-- <div class="text-center inline-block w-full login">
                    <h2 class="font-extrabold dark-color">Signed in as:</h2>
                    <p class="dark-color my-[20px] max-[1600px]:my-[15px] max-[1024px]:my-[10px] mt-[15px]">elitesigmadesigner@gmail.com</p>
                    <div class="g-btn">
                      <a href="#" class="shadow-[6px_6px_10px_#f5f8ff] bg-white border border-color-two dark-color max-[1600px]:py-[10px] py-[15px] max-[1600px]:px-[20px] px-[30px] inline-flex rounded-full font-medium gap-1 items-center"><img  alt="img" class="camera-img w-[15px] object-cover h-[15px]"> Open DupeYak Duplicate Remover</a>
                      <a href="#" class="shadow-[6px_6px_10px_#f5f8ff] bg-white border border-color-two dark-color max-[1600px]:py-[10px] py-[15px] max-[1600px]:px-[20px] px-[30px] inline-flex rounded-full font-medium gap-1 items-center"> 📄 Download Receipt</a>
                      <a href="#" class="shadow-[6px_6px_10px_#f5f8ff] bg-white border border-color-two dark-color max-[1600px]:py-[10px] py-[15px] max-[1600px]:px-[20px] px-[30px] inline-flex rounded-full font-medium gap-1 items-center"> 💬 Contact Support</a>
                      <a href="#" class="background-one text-white max-[1600px]:py-[10px] py-[15px] max-[1600px]:px-[20px] px-[30px] inline-flex rounded-full font-medium gap-1 items-center"> 🚪 Sign Out</a>
                    </div>
                </div> -->

                <div class="text-center inline-block w-full">
                    <h1 class="font-extrabold dark-color">Welcome to DupeYak Duplicate Remover <br class="max-[650px]:hidden">Duplicate Remover</h1>
                    <p class="dark-color my-[20px] max-[1600px]:my-[15px] max-[1024px]:my-[10px]">Sign in with your Google account to get started, buy PRO or restore your license</p>
                    <div class="g-btn">
                        <a href="#" class="background-one text-white max-[1600px]:py-[10px] py-[15px] max-[1600px]:px-[20px] px-[30px] inline-flex rounded-full font-medium gap-1 items-center"><img  alt="img" class="w-[15px] object-cover h-[15px] lock-img"> Sign in with Google</a>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section class="max-[767px]:py-12 features-section pb-0 max-[767px]:pb-0">
         <div class="container mx-auto px-3 max-[767px]:px-2">
            <div class="row">
                <div class="page-title mb-5 max-[1100px]:mb-5">
                    <h2 class="font-bold dark-color">Pro Features</h2>
                    <!-- <span class="flex w-[19%] h-px background-three"></span> -->
                </div>
            </div>
            <div class="row">
                <div class="grid grid-cols-4 gap-5 max-[1100px]:grid-cols-2 max-[500px]:grid-cols-1 max-[1100px]:gap-3">
                    <article class="rounded-3xl border-color-two max-[1100px]:p-4 border p-6 w-full shadow-[6px_6px_10px_#f5f8ff]">
                        <div class="articleimg">
                            <span class="w-[65px] h-[65px] max-[1100px]:w-[55px] max-[1100px]:h-[55px] flex justify-center items-center background-three rounded-full text-[25px] p-[18px]">
                                <img src="../icons/features/search.svg" alt="icon" class="w-full h-full object-cover">
                            </span>
                        </div>
                        <div class="articlecontent mt-[50px] max-[1100px]:mt-[20px]">
                            <h4 class="font22 font-bold dark-color">AI-powered Selection</h4>
                            <p class="font16 mt-1 dec-color">It will select the best photos to keep and remove the rest</p>
                        </div>
                    </article>
                    <article class="rounded-3xl border-color-two border p-6 w-full max-[1100px]:p-4 shadow-[6px_6px_10px_#f5f8ff]">
                        <div class="articleimg">
                            <span class="w-[65px] h-[65px] max-[1100px]:w-[55px] max-[1100px]:h-[55px] flex justify-center items-center background-three rounded-full text-[25px] p-[18px]">
                                <img src="../icons/features/flash.svg" alt="icon" class="w-full h-full object-cover">
                            </span>
                        </div>
                        <div class="articlecontent mt-[50px] max-[1100px]:mt-[20px]">
                            <h4 class="font22 font-bold dark-color">Unlimited Processing</h4>
                            <p class="font16 mt-1 dec-color">Process unlimited photos without daily limits</p>
                        </div>
                    </article>
                    <article class="rounded-3xl border-color-two border p-6 w-full max-[1100px]:p-4 shadow-[6px_6px_10px_#f5f8ff]">
                        <div class="articleimg">
                            <span class="w-[65px] h-[65px] max-[1100px]:w-[55px] max-[1100px]:h-[55px] flex justify-center items-center background-three rounded-full text-[25px] p-[18px]">
                                <img src="../icons/features/target.svg" alt="icon" class="w-full h-full object-cover">
                            </span>
                        </div>
                        <div class="articlecontent mt-[50px] max-[1100px]:mt-[20px]">
                            <h4 class="font22 font-bold dark-color">Advanced Selection</h4>
                            <p class="font16 mt-1 dec-color">Select photos by resolution, upload or shoot date, size, etc</p>
                        </div>
                    </article>
                    <article class="rounded-3xl border-color-two border p-6 w-full max-[1100px]:p-4 shadow-[6px_6px_10px_#f5f8ff]">
                        <div class="articleimg">
                            <span class="w-[65px] h-[65px] max-[1100px]:w-[55px] max-[1100px]:h-[55px] flex justify-center items-center background-three rounded-full text-[25px] p-[18px]">
                                 <img src="../icons/features/spanner.svg" alt="icon" class="w-full h-full object-cover">
                            </span>
                        </div>
                        <div class="articlecontent mt-[50px] max-[1100px]:mt-[20px]">
                            <h4 class="font22 font-bold dark-color">Priority Support</h4>
                            <p class="font16 mt-1 dec-color">Get help when you need it with priority customer support</p>
                        </div>
                    </article>
                </div>
            </div>
         </div>
    </section>

    <section class="max-[767px]:py-12 how-to-use">
         <div class="container mx-auto px-3 max-[767px]:px-2">
           <div class="row">
               <div class="flex  max-[900px]:flex-col">
                    <div class="w-1/2 items-center justify-center max-[900px]:w-full max-[900px]:hidden">
                        <span class="w-full pr-[100px] flex max-[1100px]:pr-[10px]">
                            <img src="../icons/how-to-us.png" alt="img" class="w-full h-full object-cover">
                        </span>
                    </div>
                    <div class="flex flex-col w-1/2 items-center justify-center max-[900px]:w-full">
                       <div class="page-title mb-5 w-full max-[1100px]:mb-5">
                            <h2 class="font-bold dark-color">How to Use</h2>
                            <!-- <span class="flex w-[34%] h-px background-three"></span> -->
                        </div>
                       <div class="flex gap-5 flex-col">
                         <article class="w-full flex gap-5 max-[767px]:gap-3">
                            <div class="articleimg">
                                <span class="w-[40px] h-[40px]  max-[767px]:w-[30px] max-[767px]:h-[30px] flex justify-center items-center background-three rounded-full text-[25px]">
                                    <i class="fa-solid fa-check text-[17px] max-[767px]:text-[14px]  color-one"></i>
                                </span>
                            </div>
                            <div class="articlecontent">
                                <h4 class="font22 font-bold dark-color">Go to DupeYak Duplicate Remover</h4>
                                <p class="font16 mt-1 dec-color  max-[767px]:mt-0">Navigate to <a href="#" class="color-one">photos.google.com</a> in your browser</p>
                            </div>
                        </article>
                        <article class="w-full flex gap-5 max-[767px]:gap-3">
                            <div class="articleimg">
                                <span class="w-[40px] h-[40px]  max-[767px]:w-[30px] max-[767px]:h-[30px] flex justify-center items-center background-three rounded-full text-[25px]">
                                   <i class="fa-solid fa-check text-[17px]  max-[767px]:text-[14px]  color-one"></i>
                                </span>
                            </div>
                            <div class="articlecontent">
                                <h4 class="font22 font-bold dark-color">Enter search term or visit an album</h4>
                                <p class="font16 mt-1 dec-color  max-[767px]:mt-0">Enter month, year or any other supported by DupeYak Duplicate Remover search term. Year is the largest one supported. Or visit an album</p>
                            </div>
                        </article>
                        <article class="w-full flex gap-5 max-[767px]:gap-3">
                            <div class="articleimg">
                                <span class="w-[40px] h-[40px]  max-[767px]:w-[30px] max-[767px]:h-[30px] flex justify-center items-center background-three rounded-full text-[25px]">
                                    <i class="fa-solid fa-check text-[17px] max-[767px]:text-[14px]  color-one"></i>
                                </span>
                            </div>
                            <div class="articlecontent">
                                <h4 class="font22 font-bold dark-color">Start Scanning</h4>
                                <p class="font16 mt-1 dec-color  max-[767px]:mt-0">Look for the duplicate cleaner interface and start finding similar photos</p>
                            </div>
                        </article>
                        <article class="w-full flex gap-5 max-[767px]:gap-3">
                            <div class="articleimg">
                                <span class="w-[40px] h-[40px]  max-[767px]:w-[30px] max-[767px]:h-[30px] flex justify-center items-center background-three rounded-full text-[25px]">
                                    <i class="fa-solid fa-check text-[17px] max-[767px]:text-[14px]  color-one"></i>
                                </span>
                            </div>
                            <div class="articlecontent">
                                <h4 class="font22 font-bold dark-color">Review & Clean</h4>
                                <p class="font16 mt-1 dec-color  max-[767px]:mt-0">Review detected duplicates and safely remove unwanted photos. It will be synced across all your devices. But if you removed something meaningful by mistake, you can always restore it from the trash</p>
                            </div>
                        </article>
                       </div>
                    </div>
                    
               </div>
            </div>
         </div>
    </section>

      <footer class="footer-section background-two rounded-[25px] rounded-b-[0]">
        <div class="container mx-auto px-5 max-[767px]:px-2 py-4 max-[767px]:py-2">
           <div class="row">
              <div class="flex items-center justify-between max-[767px]:flex-col max-[767px]:gap-1">
                  <div class="footer-menu">
                    <ul class="flex gap-[15px]">
                        <li>
                            <a href="#" class="font16 text-white">Support</a>
                        </li>
                        <li>
                            <a href="#" class="font16 text-white">Privacy</a>
                        </li>
                        <li>
                            <a href="#" class="font16 text-white">Terms</a>
                        </li>
                    </ul>
                    </div>
                    <div class="footer-copy-right">
                        <p class="font16 text-white">© 2025 AYSA OÜ. Made with ❤️ in 🇪🇪</p>
                    </div>
              </div>
           </div>
        </div>
    </footer>

    <div class="analysis-pesults-popup fixed top-0 left-0  w-full h-full before-overlay">
        <div class="ap-popupu-in h-full flex items-center w-[1250px] mx-auto relative">
             <div class="container mx-auto px-3 max-[767px]:px-2 w-[100%] !max-w-full">
                <div class="row">
                   <div class="max-height overflow-auto bg-white max-[1600px]:rounded-[20px] rounded-[30px]">
                    <div class=" flex items-center justify-between background-one p-5 max-[1600px]:rounded-[20px] rounded-[40px] !rounded-b-[0] bg-gradient-to-br from-blue-500 to-violet-600 !py-[10px]">
                        <div class="headerlogo">
                            <a href="#" class="flex items-center gap-[5px] font-bold dark-color">
                                <span class="flex w-[50px] max-[767px]:w-[45px] items-center justify-center rounded-[10px]"><img class="logo_-img rounded-[10px]" alt="logo"></span>
                            </a>
                        </div>
                        <div class="headermenu">
                            <div id="extension-version" class="version">
                                <a id="pc-results-close_" href="#" class="g-close-btn font-semibold  w-[30px] h-[30px] rounded-full bg-white flex justify-center items-center"><i  class="fa-solid fa-xmark dec-color "></i></a>
                            </div>
                        </div>
                    </div>
                    <div class="p-5 flex flex-col">
                       <div class="flex flex-col gap-3">
                          <div class="results-summary bg-gradient p-4 rounded-[20px] ">
                            <ul class="grid grid-cols-2 gap-1">
                                <li class="dark-color font-semibold flex"><span class="w-[170px] flex items-center">Total Photos </span> : <span class="dec-color font-normal pl-2">${this.photos.length}</span></li>
                                <li class="dark-color font-semibold flex row-span-3 items-center"><span class="w-[170px] flex items-center">Comparisons Made </span> : <span class="dec-color font-normal pl-2">${results.total_comparisons || results.comparisons || 0}</span></li>
                                <li class="dark-color font-semibold flex"><span class="w-[170px] flex items-center">Similar Groups Found </span> : <span class="dec-color font-normal pl-2">${results.similar_groups.length}</span></li>
                            </ul>
                        </div>
                        <div class="results-summary bg-gradient p-4 rounded-[20px]">
                            <div class="input-group flex flex-col">
                                <label class="dark-color font-semibold">Similarity Threshold:</label>
                                <span class="flex w-full gap-2">
                                    <input type="range" class="w-full">
                                    <button id="pc-reanalyze" class="whitespace-nowrap background-one text-white py-[6px] px-[15px] inline-flex rounded-full font-medium gap-1 items-center">Re-analyze</button>
                                </span>
                            </div>
                            <p class="dec-color font15">Adjust the similarity threshold to find more or fewer matches. Lower values find more similar photos, higher values are more strict.</p>
                        </div>
                        <!-- <div class="results-summary bg-white p-4 rounded-[20px] border border-color-two shadow-[6px_6px_10px_#f5f8ff] py-[20px] text-center">
                            <span class="w-[150px] mx-auto flex mb-1">
                                <img src="../icons/nodeta.png" alt="img" class="w-full h-full">
                            </span>
                            <h4 class="font22 font-bold dark-color">No Duplicates Found</h4>
                            <p class="dec-color font15">Great! No similar photos were detected in this search.</p>
                        </div> -->

                        

                       <div class="analysis-results bg-white p-6 rounded-[20px] border border-[#e2e8f0] m-[6px] shadow-lg rounded-[8px]">
                          <div class="flex justify-between items-center">
                             <h4 class="text-[18px] font-semibold text-[#0f172a]">Analysis Results</h4>
                             <p class="text-[#64748b] !text-[14px] pl-[14px]">${results.similar_groups.length}<span> groups found •</span>  ${this.photos.length} <span> images processed</span></p>

                             <button class="font-medium !text-[12px] px-[7px] py-[5px] bg-[#f5f5f4] rounded-[8px] ml-auto text-[#0f172a]">1 group selected</button>
                             <button class="font-medium !text-[14px] px-[12px] py-[8px] border border-[#e7e5e4] rounded-[8px] mx-[8px]">Select All</button>
                             <button class="font-medium !text-[14px] px-[12px] py-[8px] border border-[#ef4444] bg-[#ef4444] rounded-[8px] text-white">Process Selected Groups</button>
                          </div>
                        </div>

                        <div class="analysisresults-group bg-white  border border-[#e2e8f0] rounded-[12px] shadow-sm">
                            <div class="p-[16px] border-b border-[#e2e8f0] bg-[#f8fafc]">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-[10px]">
                                        <span>
                                           <button> <i class="fa-solid fa-angle-down text-[#94a3b8]"></i></button>
                                        </span>
                                        <span>
                                            <input type="checkbox" class="border border-[#2094f3] rounded-[8px]">
                                        </span>
                                        <span>img</span>
                                        <span class="font-semibold	text-[#0f172a] !text-[16px]">Group group-1</span>
                                        <span class="text-[12px] bg-[#f5f5f4] rounded-full py-[2px] py-[10px]">${results.similar_groups.length}<span>  images</span></span>
                                        <span class="text-[#64748b] !text-[12px]">Select group to process • Keep button to preserve images</span>
                                    </div>
                                    <div class="flex items-center gap-[5px]">
                                        <span class="flex flex-col">
                                            <span class="text-[#0f172a] font-medium !text-[14px] text-right">${results.total_comparisons || results.comparisons || 0} <span>% similar </span></span>
                                            <span class="text-[#64748b] font-medium !text-[12px] text-right">Keep: 1 • Delete: 1</span>
                                        </span>
                                        <button class="text-[14px] px-[11px] py-[8px] rounded-[8px] font-semibold text-[#3b4a5e]">Select Group</button>
                                        <button class="text-[14px] px-[11px] py-[8px] rounded-[8px] font-semibold text-[#dc2626]">Dismiss Group</button>
                                    </div>
                                </div>
                            </div>
                        </div>

  
                            <div class="p-[24px]">
                                ${(() => {
                            const photoGroups = [];
                            const videoGroups = [];

                            results.similar_groups.forEach((group, index) => {
                                const firstItemId = group.image_ids[0];
                                const isVideoGroup = this.videos.some(v => v.id === firstItemId);

                                if (isVideoGroup) {
                                videoGroups.push({ ...group, originalIndex: index });
                                } else {
                                photoGroups.push({ ...group, originalIndex: index });
                                }
                            });

                            const generateArticles = (groups, mediaType) => {
                                   console.log("generateArticlesGROPUS",groups);
                                const mediaArray = mediaType === 'video' ? this.videos : this.photos;

                                return groups.map((group, index) => {
                                const isSelectable = this.isPaidVersion || index < 2;
                                // const keptImages = new Set(mediaArray.map(item => item.id)); 
                                return group.image_ids.map((id, idx) => {
                                    const mediaItem = mediaArray.find(item => item.id === id);
                                    if (!mediaItem) return '';
                            //    const isKept = groups.has(mediaItem.id)
                            //     const shouldShowDelete = !isKept;
                                // const shouldShowDelete = !isDuplicate;
                                    const fullSizeUrl = this.convertToFullResolution(mediaItem.url);
                                    const similarityPercent = Math.round(group.similarity_score * 100);

                                    return `
                                    <article class="border rounded-[8px] overflow-hidden border-[2px] border-[#fca5a5] mb-6">
                                        <div class="p-[12px] bg-white border-b border-[#e2e8f0] flex gap-[5px] items-center">
                                        <span class="text-[#9333ea] font-semibold !text-[15px]">${index + 1}/${group.image_ids.length}</span>
                                        <span class="text-[#94a3b8] !text-[15px]">(${similarityPercent}%)</span>
                                        ${
                                            isSelectable
                                            ? `<span class="px-[8px] py-[5px] gap-[4px] border bg-[#10b981] border-[#10b981] rounded-md !text-[12px] text-white ml-auto">Keeping this file</span>`
                                           : `<span class="px-[8px] py-[5px] gap-[4px] border bg-[#10b981] border-[#10b981] rounded-md !text-[12px] text-white ml-auto">Keeping this file</span>`
                                        }
                                        </div>
                                        <div class="relative">
                                        <img src="${fullSizeUrl}" alt="${mediaItem.ariaLabel}" class="w-full h-[190px] object-cover">
                                        </div>
                                        <div class="p-[10px] bg-white border-t border-slate-200">
                                        <h4 class="text-[14px] font-semibold text-[#0f172a] mb-1 truncate">${mediaItem.ariaLabel}</h4>
                                        <p class="!text-[12px] text-[#64748b] mb-[12px]">${(mediaItem.size || 0) / 1000000} MB</p>
                                        <div class="flex items-center justify-between">
                                            <button class="px-[8px] py-[5px] gap-[4px] border border-[#e7e5e4] rounded-md !text-[12px]"><i class="fa-solid fa-eye"></i> <span>View</span></button>
                                            <button class="px-[8px] py-[5px] gap-[4px] border bg-[#10b981] border-[#10b981] rounded-md !text-[12px] text-white"><i class="fa-solid fa-check"></i> <span>Keep</span></button>
                                        </div>
                                        </div>
                                    </article>
                                    `;
                                }).join('');
                                }).join('');
                            };

                            return `
                                <div class="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                                ${generateArticles(videoGroups, 'video')}
                                ${generateArticles(photoGroups, 'photo')}
                                </div>
                            `;
                            })()}
                        </div>
                       </div>
                    </div>
                   </div>
                </div>
            </div>
        </div>
    </div>
              `);
        overlay.find('.premium-img').attr('src', premiumIconUrl);
        overlay.find('.lock-img').attr('src',lockIconUrl)
        overlay.find('.camera-img').attr('src',cameraIconUrl)
        overlay.find('.logo_-img').attr('src',logo_IconUrl)
        overlay.find('.d_img-img').attr('src',d_imageIconUrl)
        
        $('body').append(overlay);

        // Add close functionality
       $('#pc-results-close_').on('click', () => {
            this.cleanupViewportObserver();
            overlay.remove();
        });

        // Add done selecting functionality
        
		$('#pc-done-selecting').on('click', async () => {
            await this.finalizeSelectionAndSync(overlay);
        });

        // Add scroll navigation functionality
        const scrollUpBtn =$('#pc-scroll-up');
        const scrollDownBtn = $('#pc-scroll-down');
        const resultsContainer = $(overlay).find('.pc-results-container');

        if (scrollUpBtn.length) {
            scrollUpBtn.on('click', () => {
                // resultsContainer.scrollTo({ top: 0, behavior: 'smooth' });
				resultsContainer.animate({ scrollTop: 0 }, 'slow');
            });
        }

        if (scrollDownBtn.length) {
            scrollDownBtn.on('click', () => {
              //  resultsContainer.scrollTo({ top: resultsContainer.scrollHeight, behavior: 'smooth' });
			  resultsContainer.animate({ scrollTop: $resultsContainer[0].scrollHeight }, 'slow');
            });
        }

        // Add auto-select functionality
        const autoSelectBtn = $('#pc-auto-select');
        if (autoSelectBtn.length) {
            autoSelectBtn.on('click', () => {
                if (!this.isPaidVersion) {
                    // Show upgrade message for free users
                    const shouldUpgrade = confirm(
                        '🔥 Upgrade to Pro Version!\n\n' +
                        'AI-powered smart photo selection is available in the Pro version.\n\n' +
                        '✨ Features included:\n' +
                        '• Unlimited photo scanning\n' +
                        '• AI face detection for smart selection\n' +
                        '• Priority support\n\n' +
                        'Price: €9.99 (one-time payment)\n\n' +
                        'Click OK to upgrade, or Cancel to continue with basic selection.'
                    );

                    if (shouldUpgrade) {
                        this.openPurchasePopup();
                    }
                } else {
                    this.autoSelectPhotos(overlay);
                }
            });
        }

        // Add dumb-select functionality
        const dumbSelectBtn = $('#pc-dumb-select');
        if (dumbSelectBtn.length) {
      		dumbSelectBtn.on('click', () => {
                this.dumbSelectPhotos(overlay);
            });
        }

        // Add metadata-based selection functionality
        this.setupMetadataSelectionHandlers(overlay);

        // Add upgrade pro button functionality
        const upgradeProBtn = $('#pc-upgrade-pro-btn');
        if (upgradeProBtn.length) {
            upgradeProBtn.on('click', () => {
                this.openPurchasePopup();
            });
        }

        // Add similarity threshold control functionality
        // const thresholdSlider = $('#pc-similarity-threshold');
        // const thresholdValue = $('#pc-threshold-value');
        // const reanalyzeBtn =$('#pc-reanalyze');
        const thresholdSlider = document.getElementById('pc-similarity-threshold');
        const thresholdValue = document.getElementById('pc-threshold-value');
        const reanalyzeBtn = document.getElementById('pc-reanalyze');
        if (thresholdSlider.length && thresholdValue.length) {
            thresholdSlider.addEventListener('input', (e) => {
                const percentage = Math.round(parseFloat(e.target.value) * 100);
                thresholdValue.textContent = percentage + '%';
            });
        }

        if (reanalyzeBtn.length) {
           reanalyzeBtn.addEventListener('click', async () => {
                // Check daily re-analysis limit for non-pro users
                if (!this.isPaidVersion && !this.canPerformReAnalysis()) {
                    alert('You have reached limit of re-analysis today. Upgrade to PRO to unlock this or try again tomorrow.');
                    const shouldUpgrade = confirm(
                        '🔥 Upgrade to Pro Version!\n\n' +
                        'Unlimited re-analysis is available in the Pro version.\n\n' +
                        '✨ Features included:\n' +
                        '• Unlimited similar groups detection\n' +
                        '• Unlimited re-analysis\n' +
                        '• AI face detection for smart selection\n' +
                        '• Advanced metadata-based selection\n' +
                        '• Priority support\n\n' +
                        'Price: €9.99 (one-time payment)\n\n' +
                        'Click OK to upgrade, or Cancel to continue.'
                    );
                    if (shouldUpgrade) {
                        this.openPurchasePopup();
                    }
                    return;
                }

                const newThreshold = Math.round(parseFloat(thresholdSlider.val()) * 100);
                console.log(`🔄 Re-analyzing with similarity threshold: ${newThreshold}%`);

                // Update re-analysis count for non-pro users
                if (!this.isPaidVersion) {
                    await this.updateDailyReAnalysisCount();
                }

                // Disable button during re-analysis
                reanalyzeBtn.disabled = true;
                reanalyzeBtn.textContent = 'Re-analyzing...';

                // Show progress overlay
                this.showProgress(true);
                this.updateProgress(0, 'Starting re-analysis...');

                try {
                    // Get the current session ID from the frontend session manager
                    const sessionId = this.frontendSessionManager.currentSessionId;
                    if (sessionId) {
                        // Set up progress callback for re-analysis
                        this.frontendSessionManager.progressCallback = (progress, message) => {
                            this.updateProgress(progress, message);
                        };

                        // Re-run analysis with new threshold and progress tracking
                        await this.frontendSessionManager.analyzeSession(sessionId, newThreshold);

                        // Clear progress callback
                        this.frontendSessionManager.progressCallback = null;

                        this.updateProgress(100, 'Re-analysis complete! Updating results...');

                        const updatedResults = this.transformFrontendResults(
                            this.frontendSessionManager.sessions[sessionId],
                            sessionId
                        );

                        // Small delay to show completion message
                        await new Promise(resolve => setTimeout(resolve, 500));

                        // Hide progress and update the overlay with new results
                        this.showProgress(false);
                        overlay.remove();
                        this.createResultsOverlay(updatedResults);
                    }
                } catch (error) {
                    console.error('❌ Error during re-analysis:', error);
                    this.updateProgress(0, 'Re-analysis failed! Please try again.');
                    setTimeout(() => {
                        this.showProgress(false);
                        alert('Error during re-analysis. Please try again.');
                        reanalyzeBtn.prop('disabled', false).text('Re-analyze');
                    }, 2000);
                    return; // Exit early to prevent finally block from running immediately
                } finally {
                    // Only run this if we didn't have an error (normal completion)
                    if (reanalyzeBtn.prop('disabled')) {
                		reanalyzeBtn.prop('disabled', false).text('Re-analyze');
           	        }
                }
            });
        }

        // Add photo click handlers for checkbox toggling
        this.setupPhotoToggleHandlers(overlay);

        // Add group toggle functionality
        this.setupGroupToggleHandlers(overlay);

        // Initialize checkbox states based on current DupeYak Duplicate Remover state
        this.initializeCheckboxStates(overlay);

        // Load image sizes asynchronously
        this.loadImageSizes(overlay);

        // Add scroll button handlers for photos and videos
        this.setupScrollHandlers(overlay);
    }

	//convert to jquery
    setupScrollHandlers(overlay) {
        // Photo scroll buttons
        const scrollDownPhotosBtn = $('#pc-scroll-down-photos');
        const scrollUpPhotosBtn = $('#pc-scroll-up-photos');

        if (scrollDownPhotosBtn.length) {
            scrollDownPhotosBtn.on('click', function () {
                const photoGroupsSection =  $(overlay).find('.pc-photo-groups');
                if (photoGroupsSection.length) {
                    photoGroupsSection[0].scrollIntoView({ behavior: 'smooth', block: 'end' });
                }
            });
        }

        if (scrollUpPhotosBtn) {
            scrollUpPhotosBtn.on('click', function () {
                const photoGroupsSection =  $(overlay).find('.pc-photo-groups');
                if (photoGroupsSection.length) {
                    photoGroupsSection[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }

        // Video scroll buttons
        const scrollDownVideosBtn = $('#pc-scroll-down-videos');
        const scrollUpVideosBtn = $('#pc-scroll-up-videos');

        if (scrollDownVideosBtn.length) {
            scrollDownVideosBtn.on('click', function () {
                // const videoGroupsSection = overlay.querySelector('.pc-video-groups');
				const videoGroupsSection = $(overlay).find('.pc-video-groups');
                if (videoGroupsSection.length) {
                    videoGroupsSection[0].scrollIntoView({ behavior: 'smooth', block: 'end' });
                }
            });
        }

        if (scrollUpVideosBtn.length) {
            scrollUpVideosBtn.on('click', function () {
                const videoGroupsSection = $(overlay).find('.pc-video-groups');
                if (videoGroupsSection.length) {
                  //  videoGroupsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
				  videoGroupsSection[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }
    }
//convert to jquery
    setupPhotoToggleHandlers(overlay) {
        const imageItems = $(overlay).find('.pc-image-item');

       imageItems.each(function() {
            const imageContainer = item.querySelector('.pc-image-container');
            if (imageContainer.length) {
                imageContainer.on('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.togglePhotoSelection(item);
                });

                // Add hover effects
                imageContainer.on('mouseenter', function () {
                    imageContainer.style.transform = 'scale(1.02)';
                    const overlay = imageContainer.querySelector('.pc-image-overlay');
                    if (overlay.length) {
                    overlay.css('opacity', '1');
                }
                });

                imageContainer.addEventListener('mouseleave', () => {
                    imageContainer.style.transform = 'scale(1)';
                    const overlay = imageContainer.querySelector('.pc-image-overlay');
                    if (overlay.length) {
                    overlay.css('opacity', '0');
                }
                });
            }
        });
    }
//convert to jquery
    setupGroupToggleHandlers(overlay) {
        const groupToggleButtons = $(overlay).find('.pc-group-toggle');

        groupToggleButtons.each(function() { 
            $(button).on('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleGroupSelection(button, overlay);
            });
        });
    }

    toggleGroupSelection(toggleButton, overlay) {
        const groupIndex = toggleButton.getAttribute('data-group-index');
        const group = overlay.querySelector(`.pc-group[data-group-index="${groupIndex}"]`);

        if (!group) {
            console.error(`Group ${groupIndex} not found`);
            return;
        }

        // Check if this group is non-selectable for free users
        if (group.hasAttribute('data-non-selectable')) {
            console.log(`🔒 Group ${parseInt(groupIndex) + 1} is non-selectable for free users`);
            // Show upgrade message
            const shouldUpgrade = confirm(
                '🔥 Upgrade to Pro Version!\n\n' +
                'Free version allows photo selection in the first 2 groups only.\n\n' +
                '✨ Pro features:\n' +
                '• Unlimited photo selection in all groups\n' +
                '• AI-powered smart selection\n' +
                '• Metadata-based selection\n' +
                '• Priority support\n\n' +
                'Price: €9.99 (one-time payment)\n\n' +
                'Click OK to upgrade now!'
            );

            if (shouldUpgrade) {
                this.openPurchasePopup();
            }
            return;
        }

        const imageItems = group.querySelectorAll('.pc-image-item');
        const checkboxIndicators = group.querySelectorAll('.pc-checkbox-indicator');

        // Determine current state - check if any photos are selected
        let selectedCount = 0;
        checkboxIndicators.forEach(indicator => {
            if (indicator.getAttribute('data-selected') === 'true') {
                selectedCount++;
            }
        });

        // If all are selected, unselect all. Otherwise, select all
        const shouldSelectAll = selectedCount < checkboxIndicators.length;

        console.log(`🎯 Group ${parseInt(groupIndex) + 1}: ${shouldSelectAll ? 'Selecting' : 'Unselecting'} all ${imageItems.length} photos`);

        // Update all photos in the group
        imageItems.forEach(imageItem => {
            const checkboxIndicator = imageItem.querySelector('.pc-checkbox-indicator');
            if (checkboxIndicator) {
                this.updateCheckboxIndicator(checkboxIndicator, shouldSelectAll);
                this.showSelectionFeedback(imageItem, shouldSelectAll);
            }
        });

        // Update button text
        this.updateGroupToggleButton(toggleButton, shouldSelectAll, imageItems.length);

        console.log(`✅ Group ${parseInt(groupIndex) + 1}: ${shouldSelectAll ? 'Selected' : 'Unselected'} all photos`);
    }

    updateGroupToggleButton(button, allSelected, totalCount) {
        if (allSelected) {
            button.innerHTML = '☑ Unselect All';
            button.classList.add('pc-group-toggle-selected');
        } else {
            button.innerHTML = '☐ Select All';
            button.classList.remove('pc-group-toggle-selected');
        }
    }

    updateGroupToggleButtonState(imageItem) {
        // Find the group this photo belongs to
        const group = imageItem.closest('.pc-group');
        if (!group) return;

        const groupIndex = group.getAttribute('data-group-index');
        const toggleButton = group.querySelector('.pc-group-toggle');
        if (!toggleButton) return;

        // Check the selection state of all photos in this group
        const checkboxIndicators = group.querySelectorAll('.pc-checkbox-indicator');
        let selectedCount = 0;

        checkboxIndicators.forEach(indicator => {
            if (indicator.getAttribute('data-selected') === 'true') {
                selectedCount++;
            }
        });

        const totalCount = checkboxIndicators.length;
        const allSelected = selectedCount === totalCount;

        // Update the button state
        this.updateGroupToggleButton(toggleButton, allSelected, totalCount);
    }

    async togglePhotoSelection(imageItem) {
        const photoId = imageItem.getAttribute('data-photo-id');
        const checkboxIndicator = imageItem.querySelector('.pc-checkbox-indicator');

        // Check if this photo is in a non-selectable group for free users
        const group = imageItem.closest('.pc-group');
        if (group && group.hasAttribute('data-non-selectable')) {
            console.log(`🔒 Photo ${photoId} is in a non-selectable group for free users`);
            this.showSelectionError(imageItem, 'Upgrade to Pro to select photos in this group');
            // Show upgrade message
            const shouldUpgrade = confirm(
                '🔥 Upgrade to Pro Version!\n\n' +
                'Free version allows photo selection in the first 2 groups only.\n\n' +
                '✨ Pro features:\n' +
                '• Unlimited photo selection in all groups\n' +
                '• AI-powered smart selection\n' +
                '• Metadata-based selection\n' +
                '• Priority support\n\n' +
                'Price: €9.99 (one-time payment)\n\n' +
                'Click OK to upgrade now!'
            );

            if (shouldUpgrade) {
                this.openPurchasePopup();
            }
            return;
        }

        console.log(`🎯 Toggling selection for photo ${photoId} (OVERLAY ONLY)`);

        try {
            // Get current state in overlay
            const currentOverlayState = checkboxIndicator.getAttribute('data-selected') === 'true';
            const desiredState = !currentOverlayState;

            // Update overlay state only - don't touch DupeYak Duplicate Remover PWA yet
            this.updateCheckboxIndicator(checkboxIndicator, desiredState);
            this.showSelectionFeedback(imageItem, desiredState);
            console.log(`✅ Updated overlay for photo ${photoId} to: ${desiredState} (DupeYak Duplicate Remover PWA will be synced later)`);

            // Update the group toggle button state
            this.updateGroupToggleButtonState(imageItem);

        } catch (error) {
            console.error(`❌ Error toggling photo ${photoId}:`, error);
            this.showSelectionError(imageItem, 'Toggle failed');
        }
    }

    async attemptPhotoToggle(googlePhotosElement, photoId) {
        console.log(`🔧 Attempting comprehensive toggle for photo ${photoId}`);

        // Get initial state
        const checkbox = googlePhotosElement.querySelector('[role="checkbox"]');
        const initialState = checkbox ? checkbox.getAttribute('aria-checked') === 'true' : false;
        console.log(`   Initial state: ${initialState}`);

        // Strategy 1: Standard checkbox clicking with multiple methods
        if (checkbox) {
            console.log(`   🎯 Strategy 1: Checkbox clicking`);

            // Method 1a: Direct click
            try {
                checkbox.click();
                await this.delay(200);
                const newState = checkbox.getAttribute('aria-checked') === 'true';
                if (newState !== initialState) {
                    console.log(`   ✅ Method 1a (direct click) succeeded: ${initialState} → ${newState}`);
                    return true;
                }
            } catch (e) {
                console.log(`   ❌ Method 1a failed:`, e.message);
            }

            // Method 1b: Mouse event dispatch
            try {
                const mouseEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    button: 0,
                    buttons: 1,
                    clientX: checkbox.getBoundingClientRect().left + 10,
                    clientY: checkbox.getBoundingClientRect().top + 10
                });
                checkbox.dispatchEvent(mouseEvent);
                await this.delay(200);
                const newState = checkbox.getAttribute('aria-checked') === 'true';
                if (newState !== initialState) {
                    console.log(`   ✅ Method 1b (mouse event) succeeded: ${initialState} → ${newState}`);
                    return true;
                }
            } catch (e) {
                console.log(`   ❌ Method 1b failed:`, e.message);
            }

            // Method 1c: Focus and space key
            try {
                checkbox.focus();
                await this.delay(100);
                const spaceEvent = new KeyboardEvent('keydown', {
                    bubbles: true,
                    cancelable: true,
                    key: ' ',
                    code: 'Space',
                    keyCode: 32
                });
                checkbox.dispatchEvent(spaceEvent);
                await this.delay(200);
                const newState = checkbox.getAttribute('aria-checked') === 'true';
                if (newState !== initialState) {
                    console.log(`   ✅ Method 1c (space key) succeeded: ${initialState} → ${newState}`);
                    return true;
                }
            } catch (e) {
                console.log(`   ❌ Method 1c failed:`, e.message);
            }
        }

        // Strategy 2: Container clicking
        console.log(`   🎯 Strategy 2: Container clicking`);
        try {
            googlePhotosElement.click();
            await this.delay(300);
            const newState = checkbox ? checkbox.getAttribute('aria-checked') === 'true' : false;
            if (newState !== initialState) {
                console.log(`   ✅ Strategy 2 (container click) succeeded: ${initialState} → ${newState}`);
                return true;
            }
        } catch (e) {
            console.log(`   ❌ Strategy 2 failed:`, e.message);
        }

        // Strategy 3: Alternative clickable elements
        console.log(`   🎯 Strategy 3: Alternative elements`);
        const alternativeSelectors = [
            '[data-ved]',
            'div[role="button"]',
            '[aria-label*="Select"]',
            'button',
            '[tabindex="0"]',
            '.rtIMgb > div',
            '[jslog]'
        ];

        for (const selector of alternativeSelectors) {
            const elements = googlePhotosElement.querySelectorAll(selector);
            for (const element of elements) {
                try {
                    console.log(`   Trying ${selector} element...`);
                    element.click();
                    await this.delay(200);
                    const newState = checkbox ? checkbox.getAttribute('aria-checked') === 'true' : false;
                    if (newState !== initialState) {
                        console.log(`   ✅ Strategy 3 (${selector}) succeeded: ${initialState} → ${newState}`);
                        return true;
                    }
                } catch (e) {
                    // Continue to next element
                }
            }
        }

        // Strategy 4: Simulate touch events (for mobile-like behavior)
        console.log(`   🎯 Strategy 4: Touch events`);
        const targetElement = checkbox || googlePhotosElement;
        try {
            const rect = targetElement.getBoundingClientRect();
            const touchStart = new TouchEvent('touchstart', {
                bubbles: true,
                cancelable: true,
                touches: [{
                    clientX: rect.left + rect.width / 2,
                    clientY: rect.top + rect.height / 2,
                    target: targetElement
                }]
            });
            const touchEnd = new TouchEvent('touchend', {
                bubbles: true,
                cancelable: true,
                changedTouches: [{
                    clientX: rect.left + rect.width / 2,
                    clientY: rect.top + rect.height / 2,
                    target: targetElement
                }]
            });

            targetElement.dispatchEvent(touchStart);
            await this.delay(50);
            targetElement.dispatchEvent(touchEnd);
            await this.delay(200);

            const newState = checkbox ? checkbox.getAttribute('aria-checked') === 'true' : false;
            if (newState !== initialState) {
                console.log(`   ✅ Strategy 4 (touch events) succeeded: ${initialState} → ${newState}`);
                return true;
            }
        } catch (e) {
            console.log(`   ❌ Strategy 4 failed:`, e.message);
        }

        // Strategy 5: Force state change by manipulating attributes (last resort)
        console.log(`   🎯 Strategy 5: Force state change`);
        if (checkbox) {
            try {
                const newState = !initialState;
                checkbox.setAttribute('aria-checked', newState.toString());

                // Trigger change events
                const changeEvent = new Event('change', { bubbles: true });
                const inputEvent = new Event('input', { bubbles: true });
                checkbox.dispatchEvent(changeEvent);
                checkbox.dispatchEvent(inputEvent);

                await this.delay(200);
                console.log(`   ⚠️ Strategy 5 (force change) applied: ${initialState} → ${newState}`);
                return true;
            } catch (e) {
                console.log(`   ❌ Strategy 5 failed:`, e.message);
            }
        }

        console.log(`   ❌ All strategies failed for photo ${photoId}`);
        return false;
    }

    async synchronizeAllPhotoStates() {
        //console.log('🔄 Starting scroll-based photo synchronization with DupeYak Duplicate Remover PWA...');

        const overlay = document.getElementById('pc-results-overlay');
        if (!overlay) {
            console.warn('⚠️ No overlay found for synchronization');
            return;
        }

        const imageItems = overlay.querySelectorAll('.pc-image-item');
        console.log(`📊 Found ${imageItems.length} photos in overlay to check`);

        // Get photos that should be selected using their proper photo IDs
        const photosToSelect = [];

        imageItems.forEach(imageItem => {
            const photoId = imageItem.getAttribute('data-photo-id');
            const checkboxIndicator = imageItem.querySelector('.pc-checkbox-indicator');
            const shouldBeSelected = checkboxIndicator && checkboxIndicator.getAttribute('data-selected') === 'true';

            if (shouldBeSelected) {
                photosToSelect.push(photoId);
                console.log(`📌 Photo ${photoId} is marked for deletion`);
            }
        });

        console.log(`📋 Need to select ${photosToSelect.length} photos marked for deletion`);

        if (photosToSelect.length === 0) {
            //console.log('ℹ️ No photos to select');
            return;
        }

        // Start the scroll-based selection process
        await this.scrollBasedPhotoSelection(photosToSelect);
    }

    async scrollBasedPhotoSelection(photoIdsToSelect) {
        console.log(`🚀 Starting OPTIMIZED position-based selection for ${photoIdsToSelect.length} photos`);

        // NEW OPTIMIZATION: Use stored scroll positions instead of slow scrolling
        const photosWithPositions = [];
        const photosWithoutPositions = [];

        // Categorize photos by whether we have their scroll positions
        for (const photoId of photoIdsToSelect) {
            const scrollPosition = this.photoScrollPositions.get(photoId);
            if (scrollPosition !== undefined) {
                photosWithPositions.push({ id: photoId, scrollPosition });
            } else {
                photosWithoutPositions.push(photoId);
            }
        }

        console.log(`📊 Position data available for ${photosWithPositions.length}/${photoIdsToSelect.length} photos`);
        if (photosWithoutPositions.length > 0) {
            console.log(`⚠️ No position data for: ${photosWithoutPositions.join(', ')}`);
        }

        // Sort photos by scroll position to minimize scrolling
        photosWithPositions.sort((a, b) => a.scrollPosition - b.scrollPosition);

        const foundPhotos = new Set();
        let selectedCount = 0;

        // Process photos with known positions (FAST!)
        if (photosWithPositions.length > 0) {
            console.log(`🎯 Processing ${photosWithPositions.length} photos with known positions...`);

            for (const photoData of photosWithPositions) {
                console.log(`📍 Jumping to position ${photoData.scrollPosition} for photo ${photoData.id}`);

                // Jump directly to the stored scroll position
                await this.jumpToScrollPosition(photoData.scrollPosition);

                // Small delay to let photos load at this position
                await this.delay(300);

                // Look for the photo at this position
                const visiblePhotos = this.findVisiblePhotosByIds([photoData.id]);
                if (visiblePhotos.length > 0) {
                    const photoElement = visiblePhotos[0];
                    console.log(`🎯 Found photo ${photoData.id} at expected position`);

                    const success = await this.selectPhotoById(photoData.id, photoElement.element);
                    if (success) {
                        foundPhotos.add(photoData.id);
                        selectedCount++;
                        console.log(`✅ Selected photo ${photoData.id} (${selectedCount}/${photoIdsToSelect.length})`);
                    }
                } else {
                    console.warn(`❌ Photo ${photoData.id} not found at expected position ${photoData.scrollPosition}`);
                    // Add to fallback list
                    photosWithoutPositions.push(photoData.id);
                }

                // Small delay between selections
                await this.delay(100);
            }
        }

        // Handle photos without positions or those not found at expected positions
        if (photosWithoutPositions.length > 0) {
            console.log(`⚠️ ${photosWithoutPositions.length} photos don't have stored scroll positions:`);
            photosWithoutPositions.forEach(photoId => {
                console.log(`   - ${photoId}: No position data available`);
            });

            // Try a simple retry by looking near the end of the page for missing photos
            console.log(`🔍 Attempting simple retry for photos without positions...`);
            await this.retryMissingPhotos(photosWithoutPositions, foundPhotos);
            selectedCount = foundPhotos.size;
        }

        // Final summary
        const notFound = photoIdsToSelect.filter(id => !foundPhotos.has(id));
        console.log(`🎉 POSITION-BASED selection complete:`);
        console.log(`   ✅ Successfully selected: ${selectedCount}/${photoIdsToSelect.length} photos`);
        console.log(`   📊 Photos found via stored positions: ${photosWithPositions.length - notFound.length}`);
        console.log(`   ❌ Photos not found: ${notFound.length}`);

        if (notFound.length > 0) {
            console.warn(`⚠️ Photos that couldn't be selected:`, notFound);
            console.warn(`💡 Tip: These photos may have been deleted, moved, or weren't properly scanned initially`);
        }

        // Verify final count
        const finalSelected = document.querySelectorAll('[role="checkbox"][aria-checked="true"]').length;
        console.log(`📊 Final verification: ${finalSelected} total photos selected in DupeYak Duplicate Remover PWA`);
    }

    // NEW: Jump directly to a specific scroll position
    async jumpToScrollPosition(targetPosition) {
        const scrollContainer = this.findScrollableContainer();
        if (scrollContainer) {
            scrollContainer.scrollTop = targetPosition;
            console.log(`📍 Jumped to container position: ${targetPosition}`);
        } else {
            window.scrollTo(0, targetPosition);
            console.log(`📍 Jumped to document position: ${targetPosition}`);
        }
    }

    // NEW: Simple retry method - just check a few key positions without full scrolling
    async retryMissingPhotos(photoIdsToSelect, foundPhotos) {
        if (photoIdsToSelect.length === 0) return;

        console.log(`🔍 Simple retry for ${photoIdsToSelect.length} photos without position data`);

        // Try checking at top, middle, and bottom of the page
        const scrollContainer = this.findScrollableContainer();
        const maxScroll = scrollContainer ?
            Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight) :
            Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;

        const retryPositions = [
            0,                    // Top
            maxScroll * 0.5,     // Middle  
            maxScroll * 0.8,     // Near bottom
            maxScroll            // Bottom
        ];

        for (const position of retryPositions) {
            console.log(`📍 Checking position ${Math.round(position)} for missing photos...`);
            await this.jumpToScrollPosition(position);
            await this.delay(500); // Wait for photos to load

            // Look for any of the missing photos
            const visiblePhotos = this.findVisiblePhotosByIds(photoIdsToSelect);
            for (const photoData of visiblePhotos) {
                if (!foundPhotos.has(photoData.id)) {
                    console.log(`🎯 Found missing photo ${photoData.id} at position ${Math.round(position)}`);
                    const success = await this.selectPhotoById(photoData.id, photoData.element);
                    if (success) {
                        foundPhotos.add(photoData.id);
                        console.log(`✅ Successfully selected photo ${photoData.id}`);
                    }
                    await this.delay(100);
                }
            }

            // Stop if we found all missing photos
            const stillMissing = photoIdsToSelect.filter(id => !foundPhotos.has(id));
            if (stillMissing.length === 0) {
                console.log(`🎉 Found all missing photos!`);
                break;
            }
        }

        const finalMissing = photoIdsToSelect.filter(id => !foundPhotos.has(id));
        if (finalMissing.length > 0) {
            console.warn(`⚠️ Still couldn't find ${finalMissing.length} photos after retry:`, finalMissing);
        }
    }

    async scrollToTop() {
        const scrollContainer = this.findScrollableContainer();
        if (scrollContainer) {
            //console.log('📍 Scrolling to top of page...');
            scrollContainer.scrollTop = 0;
            await this.delay(1000); // Wait for photos to load at top
        } else {
            //console.log('📍 Scrolling document to top...');
            window.scrollTo(0, 0);
            await this.delay(1000);
        }
    }

    findVisiblePhotosByIds(targetPhotoIds) {
        const visiblePhotos = [];

        // Strategy 1: Find by href attribute containing photo ID
        const linkElements = document.querySelectorAll('a[href*="photo/"]');

        for (const link of linkElements) {
            const href = link.getAttribute('href');
            const match = href.match(/photo\/([^\/]+)/);

            if (match) {
                const photoId = match[1];

                if (targetPhotoIds.includes(photoId)) {
                    const photoContainer = link.closest('.rtIMgb');
                    if (photoContainer) {
                        visiblePhotos.push({
                            id: photoId,
                            element: photoContainer,
                            foundBy: 'href'
                        });
                    }
                }
            }
        }

        // Strategy 2: Find by jslog attribute containing photo ID
        const jslogElements = document.querySelectorAll('[jslog]');

        for (const element of jslogElements) {
            const jslogValue = element.getAttribute('jslog');

            if (jslogValue) {
                for (const photoId of targetPhotoIds) {
                    if (jslogValue.includes(photoId)) {
                        const photoContainer = element.closest('.rtIMgb');
                        if (photoContainer && !visiblePhotos.some(p => p.element === photoContainer)) {
                            visiblePhotos.push({
                                id: photoId,
                                element: photoContainer,
                                foundBy: 'jslog'
                            });
                        }
                    }
                }
            }
        }

        return visiblePhotos;
    }

    async selectPhotoById(photoId, photoElement) {
        try {
            const checkbox = photoElement.querySelector('[role="checkbox"]');

            if (!checkbox) {
                console.warn(`⚠️ No checkbox found for photo ${photoId}`);
                return false;
            }

            const isCurrentlySelected = checkbox.getAttribute('aria-checked') === 'true';

            if (isCurrentlySelected) {
                console.log(`⏭️ Photo ${photoId} already selected, skipping`);
                return true;
            }

            console.log(`🔘 Clicking checkbox to select photo ${photoId}`);
            checkbox.click();

            // Verify the selection worked
            await this.delay(100);
            const newState = checkbox.getAttribute('aria-checked') === 'true';

            if (newState) {
                console.log(`✅ Successfully selected photo ${photoId}`);
                return true;
            } else {
                console.warn(`❌ Click didn't change state for photo ${photoId}`);
                return false;
            }

        } catch (error) {
            console.error(`❌ Error selecting photo ${photoId}:`, error);
            return false;
        }
    }

    async scrollDownForMorePhotos() {
        const scrollContainer = this.findScrollableContainer();

        if (scrollContainer) {
            const beforeScroll = scrollContainer.scrollTop;
            const scrollAmount = Math.min(400, scrollContainer.clientHeight * 0.5); // Scroll 50% of viewport or 400px max

            scrollContainer.scrollTop += scrollAmount;

            console.log(`📍 Scrolled container from ${beforeScroll} to ${scrollContainer.scrollTop} (+${scrollAmount}px)`);
            return scrollContainer.scrollTop;
        } else {
            const beforeScroll = window.pageYOffset;
            const scrollAmount = Math.min(400, window.innerHeight * 0.5); // Scroll 50% of viewport or 400px max

            window.scrollBy(0, scrollAmount);

            console.log(`📍 Scrolled document from ${beforeScroll} to ${window.pageYOffset} (+${scrollAmount}px)`);
            return window.pageYOffset;
        }
    }

    async finalizeSelectionAndSync(overlay) {
        //console.log('🎯 FINAL SYNC: User clicked "I\'m done selecting" - now syncing with DupeYak Duplicate Remover PWA...');

        // Update the button to show progress
        const doneBtn = document.getElementById('pc-done-selecting');
        const originalText = doneBtn.innerHTML;
        doneBtn.disabled = true;
        doneBtn.innerHTML = '🔄 Syncing with DupeYak Duplicate Remover...';

        try {
            // Count how many photos are selected in overlay
            const selectedPhotos = overlay.querySelectorAll('.pc-image-item .pc-checkbox-indicator[data-selected="true"]');
            console.log(`📊 Found ${selectedPhotos.length} photos selected in overlay`);

            // Debug: List all selected photo IDs
            const selectedPhotoIds = Array.from(selectedPhotos).map(checkbox => {
                const imageItem = checkbox.closest('.pc-image-item');
                return imageItem ? imageItem.getAttribute('data-photo-id') : 'unknown';
            });
            console.log(`📋 Selected photo IDs:`, selectedPhotoIds);

            if (selectedPhotos.length === 0) {
                //console.log('ℹ️ No photos selected, skipping DupeYak Duplicate Remover sync');
                this.showCompletionMessage(overlay);
                return;
            }

            // Now perform the final synchronization with DupeYak Duplicate Remover PWA
            //console.log('🔄 Starting final synchronization with DupeYak Duplicate Remover PWA...');
            await this.synchronizeAllPhotoStates();

            // Verify the sync worked with detailed debugging
            //console.log('🔍 Verifying sync results...');
            const finalCount = this.countSelectedPhotosDetailed();
            console.log(`✅ Final sync complete: ${finalCount} photos selected in DupeYak Duplicate Remover PWA`);

            // Show completion message
            this.showCompletionMessage(overlay);

        } catch (error) {
            console.error('❌ Error during final sync:', error);
            doneBtn.innerHTML = '❌ Sync failed - try again';
            doneBtn.disabled = false;

            // Re-enable after 3 seconds
            setTimeout(() => {
                doneBtn.innerHTML = originalText;
            }, 3000);
        }
    }

    async setPhotoState(googlePhotosElement, photoId, desiredState) {
        console.log(`🎯 Setting photo ${photoId} state to: ${desiredState}`);

        const checkbox = googlePhotosElement.querySelector('[role="checkbox"]');
        if (!checkbox) {
            console.warn(`⚠️ No checkbox found for photo ${photoId}`);
            return false;
        }

        const currentState = checkbox.getAttribute('aria-checked') === 'true';
        console.log(`   Current state: ${currentState}, Desired state: ${desiredState}`);

        // If already in desired state, no need to do anything
        if (currentState === desiredState) {
            console.log(`   ✅ Photo ${photoId} already in desired state`);
            return true;
        }

        // Need to toggle to reach desired state
        console.log(`   🔧 Need to toggle photo ${photoId} from ${currentState} to ${desiredState}`);
        const success = await this.attemptPhotoToggle(googlePhotosElement, photoId);

        if (success) {
            // Verify the state changed correctly
            const newState = checkbox.getAttribute('aria-checked') === 'true';
            if (newState === desiredState) {
                console.log(`   ✅ Successfully set photo ${photoId} to ${desiredState}`);
                return true;
            } else {
                console.warn(`   ❌ Toggle succeeded but state is wrong: expected ${desiredState}, got ${newState}`);
                return false;
            }
        } else {
            console.warn(`   ❌ Failed to toggle photo ${photoId}`);
            return false;
        }
    }

    findGooglePhotosElement(photoId, photoUrl) {
        console.log(`🔍 Searching for photo element: ${photoId}`);

        // Strategy 1: Find by photo ID in href attribute
        const linkElements = document.querySelectorAll('a[href*="photo/"]');
        console.log(`   Strategy 1: Found ${linkElements.length} photo links`);

        for (const link of linkElements) {
            if (link.href.includes(photoId)) {
                console.log(`   ✅ Found by href: ${link.href}`);
                const photoContainer = link.closest('.rtIMgb');
                if (photoContainer) {
                    return photoContainer;
                }
            }
        }

        // Strategy 2: Find by jslog attribute (contains photo ID)
        const jslogElements = document.querySelectorAll('[jslog]');
        console.log(`   Strategy 2: Found ${jslogElements.length} jslog elements`);

        for (const element of jslogElements) {
            const jslogValue = element.getAttribute('jslog');
            if (jslogValue && jslogValue.includes(photoId)) {
                console.log(`   ✅ Found by jslog: ${jslogValue}`);
                const photoContainer = element.closest('.rtIMgb');
                if (photoContainer) {
                    return photoContainer;
                }
            }
        }

        // Strategy 3: Find by partial photo ID match in innerHTML
        const allContainers = document.querySelectorAll('.rtIMgb');
        console.log(`   Strategy 3: Checking ${allContainers.length} photo containers for innerHTML match`);

        for (const container of allContainers) {
            const containerHTML = container.innerHTML;
            if (containerHTML.includes(photoId)) {
                console.log(`   ✅ Found by full photo ID in innerHTML`);
                return container;
            }
        }

        // Strategy 4: Find by partial photo ID match (first 20 characters)
        console.log(`   Strategy 4: Checking for partial photo ID match (first 20 chars)`);
        const partialId = photoId.substring(0, 20);

        for (const container of allContainers) {
            const containerHTML = container.innerHTML;
            if (containerHTML.includes(partialId)) {
                console.log(`   ✅ Found by partial photo ID match: ${partialId}`);
                return container;
            }
        }

        console.warn(`🔍 Could not find DupeYak Duplicate Remover element for photo ${photoId}`);
        console.warn(`   Available photo containers on page: ${allContainers.length}`);
        console.warn(`   Available photo links on page: ${linkElements.length}`);

        return null;
    }

    async scrollToFindPhoto(photoId) {
        console.log(`🔄 Attempting to scroll to find photo ${photoId}`);

        // Try scrolling down a bit to load more photos
        const scrollContainer = this.findScrollableContainer();
        if (scrollContainer) {
            const initialScrollTop = scrollContainer.scrollTop;
            const scrollAmount = Math.min(300, scrollContainer.clientHeight * 0.4); // Scroll 40% of viewport or 300px max
            const maxScrollAttempts = 3;

            for (let i = 0; i < maxScrollAttempts; i++) {
                scrollContainer.scrollTop += scrollAmount;
                await this.delay(300); // Wait for photos to load

                // Check if we found the photo
                const found = this.findGooglePhotosElement(photoId, null);
                if (found) {
                    console.log(`✅ Found photo ${photoId} after scrolling`);
                    return true;
                }
            }

            // Scroll back to original position if not found
            scrollContainer.scrollTop = initialScrollTop;
        }

        console.warn(`⚠️ Could not find photo ${photoId} even after scrolling`);
        return false;
    }

    updateCheckboxIndicator(indicator, isSelected) {
        if (!indicator) return;

        indicator.setAttribute('data-selected', isSelected.toString());
        const checkPath = indicator.querySelector('path');

        // Also update the image container for red tint
        const imageContainer = indicator.closest('.pc-image-container');
        if (imageContainer) {
            imageContainer.setAttribute('data-selected', isSelected.toString());
        }

        if (isSelected) {
            indicator.style.backgroundColor = '#dc3545';
            indicator.style.color = 'white';
            if (checkPath) checkPath.style.display = 'block';
        } else {
            indicator.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            indicator.style.color = '#666';
            if (checkPath) checkPath.style.display = 'none';
        }
    }

    showSelectionFeedback(imageItem, isSelected) {
        // Add temporary visual feedback
        const feedback = document.createElement('div');
        feedback.className = 'pc-selection-feedback';
        feedback.textContent = isSelected ? '🗑️ Marked for deletion' : '✓ Unmarked';
        feedback.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: ${isSelected ? '#dc3545' : '#28a745'};
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            pointer-events: none;
            z-index: 1000;
        `;

        const container = imageItem.querySelector('.pc-image-container');
        if (container) {
            container.style.position = 'relative';
            container.appendChild(feedback);

            // Remove feedback after 2 seconds
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.remove();
                }
            }, 2000);
        }
    }

    showSelectionError(imageItem, message) {
        const feedback = document.createElement('div');
        feedback.className = 'pc-selection-feedback error';
        feedback.textContent = `❌ ${message}`;
        feedback.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: #dc3545;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            pointer-events: none;
            z-index: 1000;
        `;

        const container = imageItem.querySelector('.pc-image-container');
        if (container) {
            container.style.position = 'relative';
            container.appendChild(feedback);

            // Remove feedback after 3 seconds
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.remove();
                }
            }, 3000);
        }
    }
	//convert to jquery
    initializeCheckboxStates(overlay) {
        const imageItems = $(overlay).find('.pc-image-item');

        imageItems.each(function() {
            const photoId = item.attr('data-photo-id');
            const photoUrl = item.attr('data-photo-url');
            const checkboxIndicator = item.find('.pc-checkbox-indicator');

            // Find the corresponding DupeYak Duplicate Remover element
            const googlePhotosElement = this.findGooglePhotosElement(photoId, photoUrl);

            if (googlePhotosElement) {
                const checkbox = googlePhotosElement.find('[role="checkbox"]');
                if (checkbox.length) {
                    const isSelected = checkbox.attr('aria-checked') === 'true';
                    this.updateCheckboxIndicator(checkboxIndicator[0], isSelected);
                }
            }
        });

        // Initialize group toggle button states
        this.initializeGroupToggleStates(overlay);
    }

    initializeGroupToggleStates(overlay) {
        const groups = overlay.querySelectorAll('.pc-group');

        groups.forEach(group => {
            const toggleButton = group.querySelector('.pc-group-toggle');
            if (!toggleButton) return;

            const checkboxIndicators = group.querySelectorAll('.pc-checkbox-indicator');
            let selectedCount = 0;

            checkboxIndicators.forEach(indicator => {
                if (indicator.getAttribute('data-selected') === 'true') {
                    selectedCount++;
                }
            });

            const totalCount = checkboxIndicators.length;
            const allSelected = selectedCount === totalCount;

            this.updateGroupToggleButton(toggleButton, allSelected, totalCount);
        });
    }

    showCompletionMessage(resultsOverlay) {
        // Count selected photos
        const selectedCount = this.countSelectedPhotos();

        // Hide the results overlay
        resultsOverlay.style.display = 'none';

        // Create completion message overlay
        const completionOverlay = document.createElement('div');
        completionOverlay.id = 'pc-completion-overlay';
        completionOverlay.innerHTML = `
            <div class="pc-completion-container">
                <div class="pc-completion-header">
                    <button id="pc-completion-close" class="pc-completion-close-btn">×</button>
                </div>
                <div class="pc-completion-content">
                    <div class="pc-completion-icon">🗑️</div>
                    <h2 class="pc-completion-title">Ready to Delete!</h2>
                    <div class="pc-completion-message">
                        You have selected <strong>${selectedCount} photo${selectedCount !== 1 ? 's' : ''}</strong> for deletion.
                        <br><br>
                        Now just click on the <strong>trash bin icon</strong> in the top right of your DupeYak Duplicate Remover, or <strong>click 3 dots and select "Move to trash"</strong> to delete them and see how much space you saved!
                    </div>
                    <div class="pc-completion-instruction">
                        <div class="pc-trash-icon">🗑️</div>
                        <span>Look for the trash icon in DupeYak Duplicate Remover toolbar</span>
                    </div>
                    <div class="pc-completion-notice">
                        💡 <strong>Want to search again?</strong> Just reload the page to run another duplicate search.
                    </div>
                    <div class="pc-completion-buttons">
                        <button id="pc-completion-back" class="pc-btn pc-btn-secondary pc-completion-btn">
                            ← Go back
                        </button>
                        <button id="pc-completion-done" class="pc-btn pc-btn-primary pc-completion-btn">
                            Got it!
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(completionOverlay);

        // Add event listeners
        const closeBtn = document.getElementById('pc-completion-close');
        const doneBtn = document.getElementById('pc-completion-done');
        const backBtn = document.getElementById('pc-completion-back');

        const removeOverlay = () => {
            // Clean up viewport observer before removing overlays
            this.cleanupViewportObserver();

            completionOverlay.remove();
            // Also remove the original results overlay
            resultsOverlay.remove();

            // Hide the status panel and find panel
            const statusPanel = document.getElementById('pc-floating-status');
            const findPanel = document.getElementById('photo-cleaner-panel');

            if (statusPanel) {
                statusPanel.style.display = 'none';
                //console.log('✅ Hidden status panel');
            }

            if (findPanel) {
                findPanel.style.display = 'none';
                //console.log('✅ Hidden find panel');
            }

            //console.log('🎉 Extension cleanup complete - panels hidden, ready for page reload to search again');
        };

        const goBack = () => {
            completionOverlay.remove();
            // Show the results overlay again
            resultsOverlay.style.display = 'block';
        };

        closeBtn.addEventListener('click', removeOverlay);
        doneBtn.addEventListener('click', removeOverlay);
        backBtn.addEventListener('click', goBack);
    }

    async autoSelectPhotos(overlay) {
        //console.log('🤖 Starting intelligent photo selection with face detection...');

        const autoSelectBtn = document.getElementById('pc-auto-select');
        const originalText = autoSelectBtn.innerHTML;

        // Update button to show progress
        autoSelectBtn.innerHTML = '🧠 Analyzing faces...';
        autoSelectBtn.disabled = true;

        try {
            const groups = overlay.querySelectorAll('.pc-group');
            let totalSelected = 0;
            let groupsProcessed = 0;
            let selectableGroups = 0;

            // Count selectable groups for progress tracking
            groups.forEach(group => {
                if (!group.hasAttribute('data-non-selectable')) {
                    selectableGroups++;
                }
            });

            for (const group of groups) {
                // Skip non-selectable groups for free users
                if (group.hasAttribute('data-non-selectable')) {
                    console.log(`⏭️ Skipping non-selectable group ${group.getAttribute('data-group-index')} for free user`);
                    continue;
                }

                groupsProcessed++;
                autoSelectBtn.innerHTML = `🧠 Analyzing group ${groupsProcessed}/${selectableGroups}...`;

                const imageItems = Array.from(group.querySelectorAll('.pc-image-item'));

                if (imageItems.length <= 1) {
                    continue; // Skip groups with only one photo
                }

                // Analyze faces and emotions in this group
                const photoAnalysis = await this.analyzeGroupForFaces(imageItems);

                // Determine which photos to keep vs delete based on face analysis
                const photosToDelete = this.selectPhotosForDeletion(photoAnalysis);

                // Apply the selection - Update overlay states only (no DupeYak Duplicate Remover PWA sync yet)
                console.log(`📝 Updating overlay states for ${photosToDelete.length} photos to delete (OVERLAY ONLY)...`);

                for (const photoToDelete of photosToDelete) {
                    const checkboxIndicator = photoToDelete.imageItem.querySelector('.pc-checkbox-indicator');

                    if (checkboxIndicator) {
                        this.updateCheckboxIndicator(checkboxIndicator, true);
                        this.showSelectionFeedback(photoToDelete.imageItem, true);
                        console.log(`✅ Marked photo ${photoToDelete.photoId} for deletion in overlay (DupeYak Duplicate Remover PWA will be synced when user clicks "I'm done")`);
                        totalSelected++;
                    } else {
                        console.error(`❌ No checkbox indicator found for photo ${photoToDelete.photoId}`);
                    }
                }

                console.log(`✅ AI selection complete: ${totalSelected} photos marked in overlay. DupeYak Duplicate Remover PWA will be synced when user clicks "I'm done selecting".`);
            }

            console.log(`✅ Intelligently selected ${totalSelected} photos for deletion`);

            // Update group toggle button states
            this.initializeGroupToggleStates(overlay);

            // Update button to show completion
            autoSelectBtn.innerHTML = `✅ Selected ${totalSelected} photos`;

            // Scroll to the "I'm done selecting" button
            setTimeout(() => {
                const doneBtn = document.getElementById('pc-done-selecting');
                if (doneBtn) {
                    doneBtn.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });

                    // Add a subtle highlight effect
                    doneBtn.style.animation = 'pc-pulse 2s ease-in-out';
                }
            }, 500);

        } catch (error) {
            console.error('❌ Error during intelligent selection:', error);
            autoSelectBtn.innerHTML = '❌ Selection failed';
        }

        // Re-enable button after 3 seconds
        setTimeout(() => {
            autoSelectBtn.innerHTML = originalText;
            autoSelectBtn.disabled = false;
        }, 3000);
    }

    async aiSelectPhotosInGroup(overlay, groupIndex, button) {
        console.log(`🤖 Starting intelligent photo selection for group ${groupIndex + 1}...`);

        // Check if another selection is already in progress
        if (this.metadataSelectionInProgress) {
            //console.log('⚠️ Another metadata selection is already in progress, ignoring this request');
            return;
        }

        // Set flag to prevent other selections
        this.metadataSelectionInProgress = true;

        // Disable all metadata buttons
        this.disableAllMetadataButtons();

        const originalText = button.innerHTML;

        try {
            // Update button to show progress
            button.innerHTML = '🧠 Analyzing faces...';
            button.disabled = true;

            // Clear all previous selections in this group first
            this.clearGroupSelections(overlay, groupIndex);

            // Find the specific group
            const group = overlay.querySelector(`[data-group-index="${groupIndex}"]`);
            if (!group) {
                console.error(`Group ${groupIndex} not found`);
                this.metadataSelectionInProgress = false;
                this.enableAllMetadataButtons();
                return;
            }

            const imageItems = Array.from(group.querySelectorAll('.pc-image-item'));

            if (imageItems.length <= 1) {
                console.log(`⚠️ Group ${groupIndex + 1} has only ${imageItems.length} photos, skipping AI selection`);
                button.innerHTML = '⚠️ Not enough photos';

                setTimeout(() => {
                    this.metadataSelectionInProgress = false;
                    this.enableAllMetadataButtons();
                    button.innerHTML = originalText;
                }, 2000);
                return;
            }

            console.log(`🤖 Processing group ${groupIndex + 1} with ${imageItems.length} photos...`);
            button.innerHTML = `🧠 Analyzing ${imageItems.length} photos...`;

            // Analyze faces and emotions in this group
            const photoAnalysis = await this.analyzeGroupForFaces(imageItems);

            // Determine which photos to keep vs delete based on face analysis
            const photosToDelete = this.selectPhotosForDeletion(photoAnalysis);

            // Apply the selection
            let totalSelected = 0;
            for (const photoToDelete of photosToDelete) {
                const checkboxIndicator = photoToDelete.imageItem.querySelector('.pc-checkbox-indicator');

                if (checkboxIndicator) {
                    this.updateCheckboxIndicator(checkboxIndicator, true);
                    this.showSelectionFeedback(photoToDelete.imageItem, true);
                    console.log(`✅ Marked photo ${photoToDelete.photoId} for deletion in group ${groupIndex + 1} (AI selection)`);
                    totalSelected++;
                } else {
                    console.error(`❌ No checkbox indicator found for photo ${photoToDelete.photoId}`);
                }
            }

            console.log(`✅ AI selection complete for group ${groupIndex + 1}: ${totalSelected} photos marked for deletion`);

            // Update the group's toggle button state
            const groupToggleButton = group.querySelector('.pc-group-toggle');
            if (groupToggleButton) {
                // Check if all photos in the group are selected
                const checkboxIndicators = group.querySelectorAll('.pc-checkbox-indicator');
                let selectedCount = 0;
                checkboxIndicators.forEach(indicator => {
                    if (indicator.getAttribute('data-selected') === 'true') {
                        selectedCount++;
                    }
                });
                const allSelected = selectedCount === checkboxIndicators.length;
                this.updateGroupToggleButton(groupToggleButton, allSelected, checkboxIndicators.length);
            }

            // Update button to show completion
            button.innerHTML = `✅ Selected ${totalSelected} photos`;

            // Brief success feedback
            setTimeout(() => {
                this.metadataSelectionInProgress = false;
                this.enableAllMetadataButtons();
                button.innerHTML = originalText;
            }, 2000);

        } catch (error) {
            console.error('❌ Error during group AI selection:', error);
            button.innerHTML = '❌ AI selection failed';

            setTimeout(() => {
                this.metadataSelectionInProgress = false;
                this.enableAllMetadataButtons();
                button.innerHTML = originalText;
            }, 3000);
        }
    }

    async dumbSelectPhotos(overlay) {
        //console.log('🎯 Starting dumb photo selection...');

        const dumbSelectBtn = document.getElementById('pc-dumb-select');
        const originalText = dumbSelectBtn.innerHTML;

        // Update button to show progress
        dumbSelectBtn.innerHTML = '🎯 Selecting...';
        dumbSelectBtn.disabled = true;

        try {
            const groups = overlay.querySelectorAll('.pc-group');
            let totalSelected = 0;

            for (const group of groups) {
                // Skip non-selectable groups for free users
                if (group.hasAttribute('data-non-selectable')) {
                    console.log(`⏭️ Skipping non-selectable group ${group.getAttribute('data-group-index')} for free user`);
                    continue;
                }

                const imageItems = Array.from(group.querySelectorAll('.pc-image-item'));

                if (imageItems.length <= 1) {
                    continue; // Skip groups with only one photo
                }

                console.log(`📝 Processing group with ${imageItems.length} photos...`);

                // Keep the first photo, mark the rest for deletion
                for (let i = 1; i < imageItems.length; i++) {
                    const imageItem = imageItems[i];
                    const photoId = imageItem.getAttribute('data-photo-id');
                    const checkboxIndicator = imageItem.querySelector('.pc-checkbox-indicator');

                    if (checkboxIndicator) {
                        this.updateCheckboxIndicator(checkboxIndicator, true);
                        this.showSelectionFeedback(imageItem, true);
                        console.log(`✅ Marked photo ${photoId} for deletion (dumb selection)`);
                        totalSelected++;
                    } else {
                        console.error(`❌ No checkbox indicator found for photo ${photoId}`);
                    }
                }

                console.log(`✅ Dumb selection complete for group: kept first photo, marked ${imageItems.length - 1} for deletion`);
            }

            console.log(`✅ Dumb selection complete: ${totalSelected} photos marked for deletion`);

            // Update group toggle button states
            this.initializeGroupToggleStates(overlay);

            // Update button to show completion
            dumbSelectBtn.innerHTML = `✅ Selected ${totalSelected} photos`;

            // Scroll to the "I'm done selecting" button
            setTimeout(() => {
                const doneBtn = document.getElementById('pc-done-selecting');
                if (doneBtn) {
                    doneBtn.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });

                    // Add a subtle highlight effect
                    doneBtn.style.animation = 'pc-pulse 2s ease-in-out';
                }
            }, 500);

        } catch (error) {
            console.error('❌ Error during dumb selection:', error);
            dumbSelectBtn.innerHTML = '❌ Selection failed';
        }

        // Re-enable button after 3 seconds
        setTimeout(() => {
            dumbSelectBtn.innerHTML = originalText;
            dumbSelectBtn.disabled = false;
        }, 3000);
    }

    setupMetadataSelectionHandlers(overlay) {
        const metadataButtons = [
            { id: 'pc-keep-larger-size', criteria: 'size', preference: 'larger' },
            { id: 'pc-keep-smaller-size', criteria: 'size', preference: 'smaller' },
            { id: 'pc-keep-larger-storage', criteria: 'storageSize', preference: 'larger' },
            { id: 'pc-keep-smaller-storage', criteria: 'storageSize', preference: 'smaller' },
            { id: 'pc-keep-larger-resolution', criteria: 'resolution', preference: 'larger' },
            { id: 'pc-keep-smaller-resolution', criteria: 'resolution', preference: 'smaller' },
            { id: 'pc-keep-newer-taken', criteria: 'takenDate', preference: 'newer' },
            { id: 'pc-keep-older-taken', criteria: 'takenDate', preference: 'older' },
            { id: 'pc-keep-newer-upload', criteria: 'uploadDate', preference: 'newer' },
            { id: 'pc-keep-older-upload', criteria: 'uploadDate', preference: 'older' }
        ];

        metadataButtons.forEach(buttonConfig => {
            const button = document.getElementById(buttonConfig.id);
            if (button) {
                button.addEventListener('click', () => {
                    if (!this.isPaidVersion) {
                        // Show upgrade message for free users
                        const shouldUpgrade = confirm(
                            '🔥 Upgrade to Pro Version!\n\n' +
                            'Metadata-based photo selection is available in the Pro version.\n\n' +
                            '✨ Features included:\n' +
                            '• Unlimited photo scanning\n' +
                            '• AI face detection for smart selection\n' +
                            '• Advanced metadata-based selection\n' +
                            '• Priority support\n\n' +
                            'Price: €9.99 (one-time payment)\n\n' +
                            'Click OK to upgrade, or Cancel to continue with basic selection.'
                        );

                        if (shouldUpgrade) {
                            this.openPurchasePopup();
                        }
                    } else {
                        this.metadataSelectPhotos(overlay, buttonConfig.criteria, buttonConfig.preference);
                    }
                });
            }
        });

        // Add handlers for group-specific metadata buttons
        const groupMetadataButtons = overlay.querySelectorAll('.pc-btn-group-metadata');
        groupMetadataButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (!this.isPaidVersion) {
                    // Show upgrade message for free users
                    const shouldUpgrade = confirm(
                        '🔥 Upgrade to Pro Version!\n\n' +
                        'Metadata-based photo selection is available in the Pro version.\n\n' +
                        '✨ Features included:\n' +
                        '• Unlimited photo scanning\n' +
                        '• AI face detection for smart selection\n' +
                        '• Advanced metadata-based selection\n' +
                        '• Priority support\n\n' +
                        'Price: €9.99 (one-time payment)\n\n' +
                        'Click OK to upgrade, or Cancel to continue with basic selection.'
                    );

                    if (shouldUpgrade) {
                        this.openPurchasePopup();
                    }
                } else {
                    const groupIndex = parseInt(button.getAttribute('data-group-index'));
                    const criteria = button.getAttribute('data-criteria');
                    const preference = button.getAttribute('data-preference');

                    // Map criteria to match existing function parameters
                    let mappedCriteria = criteria;
                    if (criteria === 'taken_date') mappedCriteria = 'takenDate';
                    if (criteria === 'upload_date') mappedCriteria = 'uploadDate';

                    this.metadataSelectPhotosInGroup(overlay, groupIndex, mappedCriteria, preference, button);
                }
            });
        });

        // Add handlers for group-specific AI buttons
        const groupAiButtons = overlay.querySelectorAll('.pc-btn-group-ai');
        groupAiButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (!this.isPaidVersion) {
                    // Show upgrade message for free users
                    const shouldUpgrade = confirm(
                        '🔥 Upgrade to Pro Version!\n\n' +
                        'AI-powered smart photo selection is available in the Pro version.\n\n' +
                        '✨ Features included:\n' +
                        '• Unlimited photo scanning\n' +
                        '• AI face detection for smart selection\n' +
                        '• Advanced metadata-based selection\n' +
                        '• Priority support\n\n' +
                        'Price: €9.99 (one-time payment)\n\n' +
                        'Click OK to upgrade, or Cancel to continue with basic selection.'
                    );

                    if (shouldUpgrade) {
                        this.openPurchasePopup();
                    }
                } else {
                    const groupIndex = parseInt(button.getAttribute('data-group-index'));
                    const mediaType = button.getAttribute('data-media-type') || 'photo';

                    console.log(`🧠 Group-specific AI selection: Group ${groupIndex + 1} (${mediaType}s)`);
                    this.aiSelectPhotosInGroup(overlay, groupIndex, button);
                }
            });
        });
    }

    clearAllSelections(overlay) {
        //console.log('🧹 Clearing all previous selections...');

        // Find all checkbox indicators and unselect them
        const checkboxIndicators = overlay.querySelectorAll('.pc-checkbox-indicator[data-selected="true"]');
        let clearedCount = 0;

        checkboxIndicators.forEach(indicator => {
            this.updateCheckboxIndicator(indicator, false);
            const imageItem = indicator.closest('.pc-image-item');
            if (imageItem) {
                this.showSelectionFeedback(imageItem, false);
                clearedCount++;
            }
        });

        // Update all group toggle button states
        this.initializeGroupToggleStates(overlay);

        console.log(`🧹 Cleared ${clearedCount} previous selections`);
    }

    clearGroupSelections(overlay, groupIndex) {
        console.log(`🧹 Clearing previous selections in group ${groupIndex + 1}...`);

        // Find the specific group
        const group = overlay.querySelector(`[data-group-index="${groupIndex}"]`);
        if (!group) {
            console.error(`Group ${groupIndex} not found`);
            return;
        }

        // Find all checkbox indicators in this group and unselect them
        const checkboxIndicators = group.querySelectorAll('.pc-checkbox-indicator[data-selected="true"]');
        let clearedCount = 0;

        checkboxIndicators.forEach(indicator => {
            this.updateCheckboxIndicator(indicator, false);
            const imageItem = indicator.closest('.pc-image-item');
            if (imageItem) {
                this.showSelectionFeedback(imageItem, false);
                clearedCount++;
            }
        });

        // Update the group's toggle button state
        const groupToggleButton = group.querySelector('.pc-group-toggle');
        if (groupToggleButton) {
            this.updateGroupToggleButton(groupToggleButton, false, group.querySelectorAll('.pc-checkbox-indicator').length);
        }

        console.log(`🧹 Cleared ${clearedCount} previous selections in group ${groupIndex + 1}`);
    }

    async metadataSelectPhotos(overlay, criteria, preference) {
        console.log(`📊 Starting metadata-based selection: ${criteria} - ${preference}`);

        // Check if another selection is already in progress
        if (this.metadataSelectionInProgress) {
            //console.log('⚠️ Another metadata selection is already in progress, ignoring this request');
            return;
        }

        // Set flag to prevent other selections
        this.metadataSelectionInProgress = true;

        // Disable all metadata buttons
        this.disableAllMetadataButtons();

        // Find the clicked button to update its state
        let buttonId;
        if (criteria === 'takenDate') {
            buttonId = `pc-keep-${preference}-taken`;
        } else if (criteria === 'uploadDate') {
            buttonId = `pc-keep-${preference}-upload`;
        } else if (criteria === 'storageSize') {
            buttonId = `pc-keep-${preference}-storage`;
        } else {
            buttonId = `pc-keep-${preference}-${criteria}`;
        }

        const button = document.getElementById(buttonId);
        if (!button) {
            console.error(`Button not found: ${buttonId}`);
            this.metadataSelectionInProgress = false;
            this.enableAllMetadataButtons();
            return;
        }

        const originalText = button.innerHTML;

        try {
            // Disable button and show progress
            button.disabled = true;
            button.innerHTML = '📊 Clearing previous selections...';

            // Clear all previous selections first
            this.clearAllSelections(overlay);

            button.innerHTML = '📊 Getting metadata...';

            const groups = overlay.querySelectorAll('.pc-group');
            let totalPhotos = 0;
            let processedPhotos = 0;
            let totalSelected = 0;

            // Count total photos to process (only in selectable groups)
            groups.forEach(group => {
                if (!group.hasAttribute('data-non-selectable')) {
                    const imageItems = Array.from(group.querySelectorAll('.pc-image-item'));
                    if (imageItems.length > 1) {
                        totalPhotos += imageItems.length;
                    }
                }
            });

            console.log(`📊 Processing ${totalPhotos} photos across selectable groups...`);

            // Process each group
            for (const group of groups) {
                // Skip non-selectable groups for free users
                if (group.hasAttribute('data-non-selectable')) {
                    console.log(`⏭️ Skipping non-selectable group ${group.getAttribute('data-group-index')} for free user`);
                    continue;
                }

                const imageItems = Array.from(group.querySelectorAll('.pc-image-item'));

                if (imageItems.length <= 1) {
                    continue; // Skip groups with only one photo
                }

                console.log(`📊 Processing group with ${imageItems.length} photos...`);

                // Collect metadata for all photos in this group concurrently
                const groupStartProgress = processedPhotos;
                const photosWithMetadata = await this.loadMetadataConcurrently(
                    imageItems,
                    (processed, total) => {
                        const currentProgress = groupStartProgress + processed;
                        button.innerHTML = `📊 Getting photo metadata ${currentProgress}/${totalPhotos}`;
                    }
                );

                // Update processed counter
                processedPhotos += imageItems.length;

                // Determine which photos to keep based on criteria
                const photosToDelete = this.selectPhotosBasedOnMetadata(photosWithMetadata, criteria, preference);

                // Apply the selection
                for (const photoToDelete of photosToDelete) {
                    const checkboxIndicator = photoToDelete.imageItem.querySelector('.pc-checkbox-indicator');
                    if (checkboxIndicator) {
                        this.updateCheckboxIndicator(checkboxIndicator, true);
                        this.showSelectionFeedback(photoToDelete.imageItem, true);
                        totalSelected++;
                    }
                }

                console.log(`✅ Group processed: kept best photo based on ${criteria}, marked ${photosToDelete.length} for deletion`);
            }

            console.log(`✅ Metadata selection complete: ${totalSelected} photos marked for deletion based on ${criteria} (${preference})`);

            // Update group toggle button states
            this.initializeGroupToggleStates(overlay);

            // Update button to show completion
            button.innerHTML = `✅ Selected ${totalSelected} photos`;

            // Scroll to the "I'm done selecting" button
            setTimeout(() => {
                const doneBtn = document.getElementById('pc-done-selecting');
                if (doneBtn) {
                    doneBtn.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                    doneBtn.style.animation = 'pc-pulse 2s ease-in-out';
                }
            }, 500);

        } catch (error) {
            console.error('❌ Error during metadata selection:', error);
            button.innerHTML = '❌ Selection failed';
        } finally {
            // Always reset the flag and re-enable buttons after operation completes
            setTimeout(() => {
                this.metadataSelectionInProgress = false;
                this.enableAllMetadataButtons();
                button.innerHTML = originalText;
            }, 3000);
        }
    }

    async metadataSelectPhotosInGroup(overlay, groupIndex, criteria, preference, button) {
        console.log(`📊 Starting group-specific metadata selection: Group ${groupIndex + 1}, ${criteria} - ${preference}`);

        // Check if another selection is already in progress
        if (this.metadataSelectionInProgress) {
            //console.log('⚠️ Another metadata selection is already in progress, ignoring this request');
            return;
        }

        // Set flag to prevent other selections
        this.metadataSelectionInProgress = true;

        // Disable all metadata buttons (both global and group-specific)
        this.disableAllMetadataButtons();

        const originalText = button.innerHTML;

        try {
            // Disable button and show progress
            button.disabled = true;
            button.innerHTML = '📊 Clearing previous selections...';

            // Clear all previous selections in this group first
            this.clearGroupSelections(overlay, groupIndex);

            button.innerHTML = '📊 Getting metadata...';

            // Find the specific group
            const group = overlay.querySelector(`[data-group-index="${groupIndex}"]`);
            if (!group) {
                console.error(`Group ${groupIndex} not found`);
                this.metadataSelectionInProgress = false;
                this.enableAllMetadataButtons();
                return;
            }

            const imageItems = Array.from(group.querySelectorAll('.pc-image-item'));

            if (imageItems.length <= 1) {
                console.log(`⚠️ Group ${groupIndex + 1} has only ${imageItems.length} photos, skipping selection`);
                button.innerHTML = '⚠️ Not enough photos';

                setTimeout(() => {
                    this.metadataSelectionInProgress = false;
                    this.enableAllMetadataButtons();
                    button.innerHTML = originalText;
                }, 2000);
                return;
            }

            console.log(`📊 Processing group ${groupIndex + 1} with ${imageItems.length} photos...`);

            // Collect metadata for all photos in this group concurrently
            const photosWithMetadata = await this.loadMetadataConcurrently(
                imageItems,
                (processed, total) => {
                    button.innerHTML = `📊 Getting metadata ${processed}/${total}`;
                }
            );

            // Determine which photos to keep based on criteria
            const photosToDelete = this.selectPhotosBasedOnMetadata(photosWithMetadata, criteria, preference);

            // Apply the selection
            let totalSelected = 0;
            for (const photoToDelete of photosToDelete) {
                const checkboxIndicator = photoToDelete.imageItem.querySelector('.pc-checkbox-indicator');
                if (checkboxIndicator) {
                    this.updateCheckboxIndicator(checkboxIndicator, true);
                    this.showSelectionFeedback(photoToDelete.imageItem, true);
                    totalSelected++;
                }
            }

            console.log(`✅ Group ${groupIndex + 1} processed: kept best photo based on ${criteria}, marked ${photosToDelete.length} for deletion`);

            // Update the group's toggle button state
            const groupToggleButton = group.querySelector('.pc-group-toggle');
            if (groupToggleButton) {
                // Check if all photos in the group are selected
                const checkboxIndicators = group.querySelectorAll('.pc-checkbox-indicator');
                let selectedCount = 0;
                checkboxIndicators.forEach(indicator => {
                    if (indicator.getAttribute('data-selected') === 'true') {
                        selectedCount++;
                    }
                });
                const allSelected = selectedCount === checkboxIndicators.length;
                this.updateGroupToggleButton(groupToggleButton, allSelected, checkboxIndicators.length);
            }

            // Update button to show completion
            button.innerHTML = `✅ Selected ${totalSelected} photos`;

            // Brief success feedback
            setTimeout(() => {
                this.metadataSelectionInProgress = false;
                this.enableAllMetadataButtons();
                button.innerHTML = originalText;
            }, 2000);

        } catch (error) {
            console.error('❌ Error during group metadata selection:', error);
            button.innerHTML = '❌ Selection failed';

            setTimeout(() => {
                this.metadataSelectionInProgress = false;
                this.enableAllMetadataButtons();
                button.innerHTML = originalText;
            }, 3000);
        }
    }

    selectPhotosBasedOnMetadata(photosWithMetadata, criteria, preference) {
        if (photosWithMetadata.length <= 1) {
            return []; // No selection needed for single photo
        }

        console.log(`📊 Selecting photos based on ${criteria} (${preference}) from ${photosWithMetadata.length} photos`);

        // Filter out photos without the required metadata
        const validPhotos = photosWithMetadata.filter(photo => {
            const metadata = photo.metadata;

            switch (criteria) {
                case 'size':
                    return metadata.bytes && metadata.bytes > 0;
                case 'storageSize':
                    return metadata.spaceTaken !== undefined && metadata.spaceTaken !== null;
                case 'resolution':
                    return metadata.resWidth && metadata.resHeight && metadata.resWidth > 0 && metadata.resHeight > 0;
                case 'takenDate':
                    return metadata.timestamp && metadata.timestamp > 0;
                case 'uploadDate':
                    return metadata.uploadTimestamp && metadata.uploadTimestamp > 0;
                default:
                    return false;
            }
        });

        if (validPhotos.length <= 1) {
            console.log(`⚠️ Not enough photos with valid ${criteria} metadata (${validPhotos.length}/${photosWithMetadata.length})`);
            return photosWithMetadata.slice(1); // Default to keeping first photo
        }

        // Sort photos based on criteria
        validPhotos.sort((a, b) => {
            const aMetadata = a.metadata;
            const bMetadata = b.metadata;

            switch (criteria) {
                case 'size':
                    return preference === 'larger' ? bMetadata.bytes - aMetadata.bytes : aMetadata.bytes - bMetadata.bytes;
                case 'storageSize':
                    // Compare storage space taken first
                    const storageDiff = preference === 'larger' ? bMetadata.spaceTaken - aMetadata.spaceTaken : aMetadata.spaceTaken - bMetadata.spaceTaken;
                    // If storage sizes are equal, fall back to file size as tiebreaker
                    if (storageDiff === 0 && aMetadata.bytes && bMetadata.bytes) {
                        return preference === 'larger' ? bMetadata.bytes - aMetadata.bytes : aMetadata.bytes - bMetadata.bytes;
                    }
                    return storageDiff;
                case 'resolution':
                    const aResolution = aMetadata.resWidth * aMetadata.resHeight;
                    const bResolution = bMetadata.resWidth * bMetadata.resHeight;
                    return preference === 'larger' ? bResolution - aResolution : aResolution - bResolution;
                case 'takenDate':
                    return preference === 'newer' ? bMetadata.timestamp - aMetadata.timestamp : aMetadata.timestamp - bMetadata.timestamp;
                case 'uploadDate':
                    return preference === 'newer' ? bMetadata.uploadTimestamp - aMetadata.uploadTimestamp : aMetadata.uploadTimestamp - bMetadata.uploadTimestamp;
                default:
                    return 0;
            }
        });

        // Keep the first photo (best according to criteria), mark others for deletion
        const photoToKeep = validPhotos[0];
        const photosToDelete = photosWithMetadata.filter(photo => photo.photoId !== photoToKeep.photoId);

        console.log(`📊 Selection result: keeping photo ${photoToKeep.photoId}, deleting ${photosToDelete.length} others`);
        console.log(`📊 Kept photo metadata:`, photoToKeep.metadata);

        // Log additional details for storage size selection
        if (criteria === 'storageSize') {
            const spaceTaken = photoToKeep.metadata.spaceTaken;
            const fileSize = photoToKeep.metadata.bytes;
            console.log(`💳 Storage selection: kept photo with spaceTaken=${spaceTaken}, fileSize=${fileSize ? this.formatFileSize(fileSize) : 'unknown'}`);

            // Check if tiebreaker was used
            const equalSpaceTaken = validPhotos.filter(p => p.metadata.spaceTaken === spaceTaken);
            if (equalSpaceTaken.length > 1) {
                console.log(`🎯 Tiebreaker used: ${equalSpaceTaken.length} photos had equal storage space (${spaceTaken}), selected based on file size`);
            }
        }

        return photosToDelete;
    }

    async analyzeGroupForFaces(imageItems) {
        const photoAnalysis = [];

        for (const imageItem of imageItems) {
            const photoId = imageItem.getAttribute('data-photo-id');
            const photoUrl = imageItem.getAttribute('data-photo-url');
            const mediaType = imageItem.getAttribute('data-media-type') || 'photo';

            let faceData = null;

            if (this.modelsLoaded) {
                try {
                    // Find the original photo data to get the captured image
                    const originalPhoto = this.photos.find(p => p.id === photoId);

                    if (originalPhoto && originalPhoto.capturedImageData) {
                        console.log(`🔍 Analyzing captured image for photo ${photoId}...`);

                        // Create a canvas from the captured image data
                        const canvas = await this.createCanvasFromImageData(originalPhoto.capturedImageData);

                        if (canvas) {
                            // Detect faces and expressions using the canvas
                            const detections = await faceapi
                                .detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions())
                                .withFaceExpressions();

                            if (detections && detections.length > 0) {
                                // Calculate happiness score for all faces
                                let totalHappiness = 0;
                                let faceCount = 0;

                                for (const detection of detections) {
                                    const expressions = detection.expressions;
                                    // Happiness score: happy + (surprised * 0.3) - (sad * 0.5) - (angry * 0.7)
                                    const happinessScore = expressions.happy +
                                        (expressions.surprised * 0.3) -
                                        (expressions.sad * 0.5) -
                                        (expressions.angry * 0.7);
                                    totalHappiness += Math.max(0, Math.min(1, happinessScore));
                                    faceCount++;
                                }

                                faceData = {
                                    faceCount: faceCount,
                                    averageHappiness: totalHappiness / faceCount,
                                    detections: detections
                                };

                                console.log(`😊 Photo ${photoId}: ${faceCount} faces, happiness: ${(faceData.averageHappiness * 100).toFixed(1)}%`);
                            } else {
                                console.log(`👤 Photo ${photoId}: No faces detected`);
                            }
                        }
                    } else {
                        console.warn(`⚠️ No captured image data found for photo ${photoId}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ Face detection failed for photo ${photoId}:`, error);
                }
            }

            photoAnalysis.push({
                imageItem,
                photoId,
                photoUrl,
                faceData
            });
        }

        return photoAnalysis;
    }

    async createCanvasFromImageData(base64Data) {
        return new Promise((resolve, reject) => {
            try {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    canvas.width = img.width;
                    canvas.height = img.height;

                    ctx.drawImage(img, 0, 0);
                    resolve(canvas);
                };
                img.onerror = () => {
                    reject(new Error('Failed to load image data'));
                };

                // Handle both data URL and raw base64
                if (base64Data.startsWith('data:')) {
                    img.src = base64Data;
                } else {
                    img.src = `data:image/png;base64,${base64Data}`;
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    selectPhotosForDeletion(photoAnalysis) {
        const photosToDelete = [];

        // Check if any photos have face data
        const photosWithFaces = photoAnalysis.filter(p => p.faceData && p.faceData.faceCount > 0);

        if (photosWithFaces.length > 0) {
            // Face-based selection: keep the happiest photo(s)
            //console.log('🧠 Using face-based selection algorithm');

            // Sort by happiness score (descending)
            photosWithFaces.sort((a, b) => b.faceData.averageHappiness - a.faceData.averageHappiness);

            // Keep the happiest photo, delete the rest
            const photoToKeep = photosWithFaces[0];
            console.log(`😊 Keeping happiest photo ${photoToKeep.photoId} (happiness: ${(photoToKeep.faceData.averageHappiness * 100).toFixed(1)}%)`);

            // Mark all other photos with faces for deletion
            for (let i = 1; i < photosWithFaces.length; i++) {
                photosToDelete.push(photosWithFaces[i]);
                console.log(`🗑️ Deleting photo ${photosWithFaces[i].photoId} (happiness: ${(photosWithFaces[i].faceData.averageHappiness * 100).toFixed(1)}%)`);
            }

            // Also delete photos without faces in this group
            const photosWithoutFaces = photoAnalysis.filter(p => !p.faceData || p.faceData.faceCount === 0);
            for (const photo of photosWithoutFaces) {
                photosToDelete.push(photo);
                console.log(`🗑️ Deleting photo without faces ${photo.photoId}`);
            }

        } else {
            // Fallback: no faces detected, use original logic (keep first, delete rest)
            //console.log('🤖 No faces detected, using fallback selection (keep first photo)');

            for (let i = 1; i < photoAnalysis.length; i++) {
                photosToDelete.push(photoAnalysis[i]);
                console.log(`🗑️ Deleting photo ${photoAnalysis[i].photoId} (fallback logic)`);
            }
        }

        return photosToDelete;
    }

    countSelectedPhotos() {
        let count = 0;
        const imageItems = document.querySelectorAll('#pc-results-overlay .pc-image-item');

        imageItems.forEach(item => {
            const checkboxIndicator = item.querySelector('.pc-checkbox-indicator');
            if (checkboxIndicator && checkboxIndicator.getAttribute('data-selected') === 'true') {
                count++;
            }
        });

        console.log(`📊 countSelectedPhotos: Found ${count} selected photos in overlay`);
        return count;
    }

    countSelectedPhotosDetailed() {
        let count = 0;
        let foundCount = 0;
        let notFoundCount = 0;
        const selectedInOverlay = [];
        const selectedInGoogle = [];
        const notFound = [];

        const imageItems = document.querySelectorAll('#pc-results-overlay .pc-image-item');
        console.log(`🔍 Checking ${imageItems.length} photos in overlay...`);

        imageItems.forEach(item => {
            const photoId = item.getAttribute('data-photo-id');
            const photoUrl = item.getAttribute('data-photo-url');
            const checkboxIndicator = item.querySelector('.pc-checkbox-indicator');
            const overlaySelected = checkboxIndicator && checkboxIndicator.getAttribute('data-selected') === 'true';

            if (overlaySelected) {
                selectedInOverlay.push(photoId);
            }

            // Find the corresponding DupeYak Duplicate Remover element
            const googlePhotosElement = this.findGooglePhotosElement(photoId, photoUrl);

            if (googlePhotosElement) {
                foundCount++;
                const checkbox = googlePhotosElement.querySelector('[role="checkbox"]');
                if (checkbox && checkbox.getAttribute('aria-checked') === 'true') {
                    count++;
                    selectedInGoogle.push(photoId);
                }
            } else {
                notFoundCount++;
                notFound.push(photoId);
            }
        });

        console.log(`📊 Detailed count results:`);
        console.log(`   - Photos in overlay: ${imageItems.length}`);
        console.log(`   - Selected in overlay: ${selectedInOverlay.length}`, selectedInOverlay);
        console.log(`   - Found in DupeYak Duplicate Remover: ${foundCount}`);
        console.log(`   - Selected in DupeYak Duplicate Remover: ${count}`, selectedInGoogle);
        console.log(`   - Not found in DupeYak Duplicate Remover: ${notFoundCount}`, notFound);

        // Check if there are mismatches
        const overlayButNotGoogle = selectedInOverlay.filter(id => !selectedInGoogle.includes(id));
        const googleButNotOverlay = selectedInGoogle.filter(id => !selectedInOverlay.includes(id));

        if (overlayButNotGoogle.length > 0) {
            console.warn(`⚠️ Photos selected in overlay but NOT in DupeYak Duplicate Remover:`, overlayButNotGoogle);
        }
        if (googleButNotOverlay.length > 0) {
            console.warn(`⚠️ Photos selected in DupeYak Duplicate Remover but NOT in overlay:`, googleButNotOverlay);
        }

        return count;
    }

    showProgress(show) {
        const progressTextElement = document.getElementById('pc-progress-text');
        const photoCountElement = document.getElementById('pc-photo-count');

        if (progressTextElement) {
            progressTextElement.style.display = show ? 'flex' : 'none';
        }

        if (photoCountElement) {
            photoCountElement.style.display = show ? 'none' : 'flex';
        }
    }

    // showWindowWarning(show) {
    //     let warningElement = document.getElementById('pc-window-warning');

    //     if (show) {
    //         // Create warning element if it doesn't exist
    //         if (!warningElement) {
    //             warningElement = document.createElement('div');
    //             warningElement.id = 'pc-window-warning';
                
    //             warningElement.innerHTML = 'Please keep this window active — resizing may interrupt your task';
    //             document.body.appendChild(warningElement);
    //         }
    //         warningElement.style.display = 'block';
    //     } else {
    //         // Hide warning element
    //         if (warningElement) {
    //             warningElement.style.display = 'none';
    //         }
    //     }
    // }

    showWindowWarning(show) {
    let warningElement = $('#pc-window-warning');

    if (show) {
        if (!warningElement.length) {
            const warningIconUrl = chrome.runtime.getURL('../icons/warning.svg');

            warningElement = $(`
                <div id="pc-window-warning" class="!bg-[#fffcea] rounded-[17px] p-4 relative  ml-auto !border-[#fce4b1] border ">
                    <a href="#" class="flex items-center gap-[5px] font-bold dark-color">
                        <span class="new-128 flex w-[45px] max-[767px]:w-[45px] items-center justify-center rounded-[10px]" src="chrome-extension://flcmckdkmfkfebllbphddhghjkmoijfl/icons/new128.png"><img class="pc-warning-icon new-128 rounded-[10px]" alt="warning icon" src="chrome-extension://flcmckdkmfkfebllbphddhghjkmoijfl/icons/new128.png" alt="logo" data-iml="50074.300000190735"></span>
                    </a><p class="dark-color !leading-[17px]">Please keep this window active — resizing may interrupt your task</p></div>
            `);

            // Set icon src just like your paush-img example
            warningElement.find('.pc-warning-icon').attr('src', warningIconUrl);

            $('body').append(warningElement);
        }
        warningElement.show();
    } else {
        warningElement.hide();
    }
}


    // updateProgress(percent, text) {

    //        document.querySelectorAll('.rtIMgb, .fCPuz, .nV0gYe').forEach(el => el.remove());
    // const floatingStatusElement = document.getElementById('pc-floating-status');
    // const newMagnifierIconUrl = chrome.runtime.getURL('../icons/magnifier.svg');
    // if (floatingStatusElement && floatingStatusElement.style.display === 'none') {
    //     floatingStatusElement.style.display = 'block'; // pehli bar show karo
    // }
    //     const textElement = document.getElementById('pc-progress-text');

    //      if (textElement) {
    //     if (!textElement.querySelector('input[type="range"]')) {
    //          const label = document.createElement('label');
    //         label.className = 'labelrange';
    //         // label.textContent = text;
    //           label.innerHTML = `<img src="${newMagnifierIconUrl}" alt="icon" style="width:16px;height:16px;">${text}`;
    //         const range = document.createElement('input');
    //         range.type = 'range';
    //         range.min = 0;
    //         range.max = 100;
    //         range.value = 0;
    //         range.className = 'w-full';
    //         textElement.innerHTML = ''; 
    //        textElement.appendChild(label);
    //         label.appendChild(range);
    //     }

    //     const rangeInput = textElement.querySelector('input[type="range"]');
    //     if (percent < 87) {
    //         rangeInput.value = percent; // upload phase
    //     } else {
    //         const analysisPercent = ((percent - 87) * (100 / 13)).toFixed(4);
    //         rangeInput.value = analysisPercent;
    //     }
    //   textElement.innerHTML = `<img src="${newMagnifierIconUrl}" alt="icon" style="width:16px;height:16px;">${text}`;
    //     textElement.title = text; // Hover par detailed text
    // }
    // }

    //RUNNING :
//     updateProgress(percent, text) {
//     document.querySelectorAll('.rtIMgb, .fCPuz, .nV0gYe').forEach(el => el.remove());

//     const floatingStatusElement = document.getElementById('pc-floating-status');
//     const newMagnifierIconUrl = chrome.runtime.getURL('../icons/magnifier.svg');

//     if (floatingStatusElement && floatingStatusElement.style.display === 'none') {
//         floatingStatusElement.style.display = 'block';
//     }

//     const textElement = document.getElementById('pc-progress-text');

//     if (textElement) {
//         // if (!textElement.querySelector('input[type="range"]')) {
//         //     const label = document.createElement('label');
//         //     label.className = 'labelrange';

//         //     const img = document.createElement('img');
//         //     img.src = newMagnifierIconUrl;
//         //     img.alt = "icon";
//         //     img.style.width = "16px";
//         //     img.style.height = "16px";

//         //     const textNode = document.createTextNode(text);

//         //     const range = document.createElement('input');
//         //     range.type = 'range';
//         //     range.min = 0;
//         //     range.max = 100;
//         //     range.value = 0;
//         //     range.className = 'w-full';

//         //     textElement.innerHTML = ''; // purana content clear
//         //     label.appendChild(img);
//         //     label.appendChild(textNode);
//         //     label.appendChild(range);
//         //     textElement.appendChild(label);
//         // }
// if (!textElement.querySelector('input[type="range"]')) {
//     const label = document.createElement('label');
//     label.className = 'labelrange';
//     // Icon + text (upar)
//     label.innerHTML = `<img src="${newMagnifierIconUrl}" alt="icon" style="width:16px;height:16px;">${text}`;

//     const range = document.createElement('input');
//     range.type = 'range';
//     range.min = 0;
//     range.max = 100;
//     range.value = 0;
//     range.className = 'w-full';

//     // HTML reset
//     textElement.innerHTML = '';
//     // Pehle icon + text
//     textElement.appendChild(label);
//     // Fir slider niche
//     textElement.appendChild(range);
// }

//         const rangeInput = textElement.querySelector('input[type="range"]');
//         if (percent < 87) {
//             rangeInput.value = percent;
//         } else {
//             const analysisPercent = ((percent - 87) * (100 / 13)).toFixed(4);
//             rangeInput.value = analysisPercent;
//         }

//         // Sirf text update karo, pura HTML overwrite na karo
//         const label = textElement.querySelector('label');
//         if (label) {
//             label.childNodes[1].nodeValue = text; // second child text node update
//         }

//         textElement.title = text;
//     }
// }

    updateProgress(percent, text) {
    document.querySelectorAll('.rtIMgb, .fCPuz, .nV0gYe').forEach(el => el.remove());

    const floatingStatusElement = document.getElementById('pc-floating-status');
    const newMagnifierIconUrl = chrome.runtime.getURL('../icons/magnifier.svg');

    if (floatingStatusElement && floatingStatusElement.style.display === 'none') {
        floatingStatusElement.style.display = 'block';
    }

    const textElement = document.getElementById('pc-progress-text');

    if (textElement) {
if (!textElement.querySelector('input[type="range"]')) {


   textElement.innerHTML = `
                <label class="labelrange">
                    <img src="${newMagnifierIconUrl}" alt="icon" style="width:16px;height:16px;"> ${text}
                </label>
             <div class="progress bg-white w-full h-[25px] relative rounded-[8px]">
    <div class="progress-done background-one text-[#fff] flex items-center justify-center h-full rounded-[8px]" data-done="50" style="width: 50%; opacity: 1;">10%</div>
</div>
            `;
        }


        let displayPercent;
        if (percent < 87) {
            displayPercent = percent;
        } else {
              displayPercent = ((percent - 87) * (100 / 13)).toFixed(0);
        }
        displayPercent = Math.round(displayPercent);
        const progressDone = textElement.querySelector('.progress-done');
       if (progressDone) {
            progressDone.style.width = displayPercent + '%';
            progressDone.setAttribute('data-done', displayPercent);
            progressDone.textContent = displayPercent + '%';
        }

        // Label ka text update karo
        const label = textElement.querySelector('label');
        if (label) {
            label.childNodes[1].nodeValue = ` ${text}`;
        }

        textElement.title = text;
    }
}


    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    debugSaveImage(base64Data, filename) {
        try {
            // Convert base64 to blob
            const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);

            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const blob = new Blob([bytes], { type: 'image/jpeg' });
            const blobUrl = URL.createObjectURL(blob);

            // Create a temporary link for download
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `${filename}.jpg`;
            link.style.display = 'none';
            document.body.appendChild(link);

            // Log debug information with blob URL for inspection
            console.log(`💾 Debug: Image "${filename}" created as blob`);
            console.log(`🔗 Blob URL (right-click to open in new tab): ${blobUrl}`);
            console.log(`📊 Blob size: ${blob.size} bytes`);
            console.log(`🖼️ Click to download:`, link);

            // Create visual preview in console (works in Chrome DevTools)
            this.debugShowImagePreview(blobUrl, filename);

            // Auto-click to download (commented out by default)
            // link.click();

            // Clean up after 30 seconds to prevent memory leaks
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
                console.log(`🧹 Cleaned up blob URL for "${filename}"`);
            }, 30000);

            // Return blob URL for immediate use if needed
            return blobUrl;
        } catch (error) {
            console.warn('Debug save failed:', error);
            return null;
        }
    }

    debugShowImagePreview(blobUrl, filename) {
        try {
            // Create a small preview image for console logging
            const img = new Image();
            img.onload = () => {
                console.log(`🖼️ Preview of "${filename}" (${img.naturalWidth}x${img.naturalHeight}):`, img);
                console.log(`%c `, `
                    background-image: url(${blobUrl}); 
                    background-size: contain; 
                    background-repeat: no-repeat; 
                    background-position: center;
                    width: 100px; 
                    height: 100px; 
                    border: 1px solid #ccc;
                    display: inline-block;
                `);
            };
            img.src = blobUrl;
        } catch (error) {
            console.warn('Debug preview failed:', error);
        }
    }

    checkViewportSize() {
        const minWidth = 1200;
        const minHeight = 500;
        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;

        return {
            adequate: currentWidth >= minWidth && currentHeight >= minHeight,
            currentWidth,
            currentHeight,
            minWidth,
            minHeight
        };
    }

    showViewportResizeMessage(viewportInfo) {
        // Remove existing resize message if any
        const existingMessage = document.getElementById('pc-resize-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const message = document.createElement('div');
        message.id = 'pc-resize-message';
        message.innerHTML = `
            <div class="pc-resize-modal">
                <div class="pc-resize-content">
                    <h3>📏 Please Resize Your Browser</h3>
                    <p>The Photo Duplicate Finder needs more space to process multiple images simultaneously.</p>
                    
                    <div class="pc-size-info">
                        <div class="pc-size-current">
                            <strong>Current Size:</strong><br>
                            ${viewportInfo.currentWidth} × ${viewportInfo.currentHeight} pixels
                        </div>
                        <div class="pc-size-required">
                            <strong>Required Size:</strong><br>
                            ${viewportInfo.minWidth} × ${viewportInfo.minHeight} pixels minimum
                        </div>
                    </div>
                    
                    <div class="pc-resize-buttons">
                        <button id="pc-resize-check" class="pc-btn pc-btn-primary">
                            ✓ Check Size Again
                        </button>
                        <button id="pc-resize-close" class="pc-btn pc-btn-secondary">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(message);

        // Add event listeners
        document.getElementById('pc-resize-check').addEventListener('click', () => {
            message.remove();
            this.initializeFullPanel(); // Try again
        });

        document.getElementById('pc-resize-close').addEventListener('click', () => {
            message.remove();
            this.addMinimalButton(); // Go back to minimal button
        });

        // Also listen for window resize
        const resizeHandler = () => {
            const newCheck = this.checkViewportSize();
            if (newCheck.adequate) {
                message.remove();
                window.removeEventListener('resize', resizeHandler);
                this.initializeFullPanel();
            } else {
                // Update the displayed current size
                const currentSizeEl = message.querySelector('.pc-size-current');
                if (currentSizeEl) {
                    currentSizeEl.innerHTML = `<strong>Current Size:</strong><br>${newCheck.currentWidth} × ${newCheck.currentHeight} pixels`;
                }
            }
        };

        window.addEventListener('resize', resizeHandler);
    }

	//convert to jquery
    async startFullWorkflow() {
        if (this.isProcessing) return;

        // Check viewport size before starting workflow
        const viewportCheck = this.checkViewportSize();
        if (!viewportCheck.adequate) {
            this.showViewportResizeMessage(viewportCheck);
            return;
        }

        try {
            // Fetch user-defined similarity threshold value
            const similarityInput = $('#pc-similarity');
            const similarityThreshold = parseInt(similarityInput.text()) || 75;
            // const similarityInput = document.getElementById('pc-similarity');
            // const similarityThreshold = parseInt(similarityInput.innerText) || 75;

            console.log(`▶️ Full scan initiated with similarity set to ${similarityThreshold}%`);
            console.log(`📥 Raw input: "${similarityInput?.value}", Parsed: ${similarityThreshold}`);

            // Store threshold for later use
            this.similarityThreshold = similarityThreshold;
            console.log(`📌 Threshold saved as: ${this.similarityThreshold}%`);

            // Set flag to indicate this is a full workflow (not standalone scan)
            this.isFullWorkflow = true;

              // Start scanning process
            //console.log('🔍 Commencing image scan...');
            const scanResult = await this.startScanning();

            // Exit if redirected to new tab/window
            if (scanResult === 'NEW_WINDOW_OPENED') {
                //console.log('🪟 Workflow moved to newly opened window');
                return;
            }

            console.log(`✔️ Scanning finished. Total images collected: ${this.photos.length}`);

            // Proceed to analysis if enough images exist
            if (this.photos.length >= 2) {
                console.log(`🧪 Beginning duplicate analysis on ${this.photos.length} photos`);
                await this.analyzePhotos();
                //console.log('🎯 Duplicate check completed successfully');
            } else if (this.photos.length === 1) {
                //console.log('⚠️  Only one photo found — insufficient for comparison');
                alert('Found only one photo. Need at least two photos for comparison.');
            } else {
                //console.log('📭 No photos detected on current page');
                alert('No photos found. Please ensure you are viewing visible DupeYak Duplicate Remover items');
                const scanButtonEl = $('#pc-scan');
                if (scanButtonEl.length) {
                    $('.paush-img').remove();
                    scanButtonEl.find('.btn-label').text('🔍 Scan for Duplicates').parent().prop('disabled', false);
                }
            }

           // Resetting internal flags and UI elements
            this.isFullWorkflow = false;
            this.isProcessing = false;

            const scanButtonEl = $('#pc-scan');
            if (scanButtonEl.length) {
                scanBtn.find('.btn-label').text('🔍 Scan for Duplicates').parent().prop('disabled', false);
            }
        } catch (error) {
            console.error('🚫 An error occurred during workflow execution:', error);

            // Reset all states
            this.isFullWorkflow = false;
            this.isProcessing = false;
            this.isScanning = false;
            this.showWindowWarning(false); // Hide window warning on error

            // Reset UI state
            const scanButtonEl = $('#pc-scan');
            if (scanButtonEl.length) {
                scanBtn.find('.btn-label').text('🔍 Scan for Duplicates').parent().prop('disabled', false);
            }

            alert('Error during scanning/analysis: ' + error.message);
        }
    }



    showAnalysisButtons() {
        if (!isValidGooglePhotosPage()) {
            this.showInfoMessage();
            return;
        }

        // Extract photos to get count
        this.extractPhotos();
        const photosFound = this.photos.length;

        if (photosFound === 0) {
            //console.log('No photos found on this page');
            return;
        }

        // Remove existing controls
        this.removeExistingControls();

        // Create main container
        const container = document.createElement('div');
        container.id = 'pc-controls';
        container.innerHTML = `
            <div class="pc-header">
                <h3>📸 Photo & Video Duplicate Finder</h3>
                <p>Found ${photosFound} photos and ${this.videos.length} videos on this page</p>
            </div>
            <div class="pc-actions">
                <button id="pc-find-duplicates" class="pc-button pc-button-primary">
                    🔍 Find Duplicates & Similar Photos/Videos
                </button>
                <button id="pc-choose-auto" class="pc-button pc-button-secondary" style="display: none;">
                    🤖 Choose automatically
                </button>
            </div>
        `;

        // Insert the container
        const targetContainer = document.querySelector('[data-ved]') || document.body;
        targetContainer.insertBefore(container, targetContainer.firstChild);

        // Add event listeners
        const findDuplicatesBtn = document.getElementById('pc-find-duplicates');
        if (findDuplicatesBtn) {
            findDuplicatesBtn.onclick = () => {
                this.startFullWorkflow();
            };
        }

        const chooseAutoBtn = document.getElementById('pc-choose-auto');
        if (chooseAutoBtn) {
            chooseAutoBtn.onclick = () => {
                this.chooseAutomatically();
            };
        }

        //console.log('✅ Analysis buttons added successfully');
    }

    removeExistingControls() {
        // Remove any existing control elements
        const existingControls = document.getElementById('pc-controls');
        if (existingControls) {
            existingControls.remove();
        }
    }

    chooseAutomatically() {
        // Placeholder method for automatic photo selection
        //console.log('🤖 Automatic photo selection not yet implemented');
        alert('Automatic photo selection feature coming soon!');
    }

    async getOriginalImageSize(photo) {
        try {
            // Check cache first using photo ID
            if (this.imageSizeCache && this.imageSizeCache[photo.id]) {
                const cachedInfo = this.imageSizeCache[photo.id];

                // Handle backward compatibility: if cached data is old string format, convert it
                if (typeof cachedInfo === 'string') {
                    console.log(`🔄 Converting old cached format for photo ${photo.id}`);
                    // Check if we're already upgrading this cache entry to prevent double requests
                    if (this.imageSizeLoaders && this.imageSizeLoaders.has(photo.id)) {
                        console.log(`⏳ Already upgrading cache for photo ${photo.id}, returning old format for now`);
                        return { formatted: cachedInfo, bytes: 0, takesUpSpace: null, spaceTaken: null, isOriginalQuality: null };
                    }
                    // Don't return here - continue to fetch full info and update cache
                } else {
                    // New format - return immediately
                    return cachedInfo;
                }
            }

            // Get media key from photo data - we need to extract this from the photo element
            const mediaKey = await this.extractMediaKeyFromPhoto(photo);
            if (!mediaKey) {
                console.warn(`⚠️ Could not extract media key for photo ${photo.id}`);
                return null;
            }

            // Use dual API approach: getItemInfoExt for detailed info + getBatchMediaInfo for upload timestamp
            console.log(`🌐 Making dual API calls for media key: ${mediaKey.substring(0, 20)}...`);

            const [extendedInfo, batchInfo] = await Promise.all([
                this.getItemInfoExt(mediaKey),
                this.getBatchMediaInfo([mediaKey])
            ]);

            console.log(`📊 Extended API response for photo ${photo.id}:`, extendedInfo);
            console.log(`📊 Batch API response for photo ${photo.id}:`, batchInfo);

            // Check if we have enough data from at least one API
            if (extendedInfo && extendedInfo.size) {
                const sizeFormatted = this.formatFileSize(extendedInfo.size);

                // Merge data from both APIs, with fallback if batch API fails
                const sizeInfo = {
                    formatted: sizeFormatted,
                    bytes: extendedInfo.size,
                    resWidth: extendedInfo.resWidth,
                    resHeight: extendedInfo.resHeight,
                    takesUpSpace: extendedInfo.takesUpSpace,
                    spaceTaken: extendedInfo.spaceTaken,
                    isOriginalQuality: extendedInfo.isOriginalQuality,
                    timestamp: extendedInfo.timestamp,              // Photo taken date from extended API
                    uploadTimestamp: batchInfo?.[0]?.creationTimestamp || null, // Upload date from batch API (may be null)
                    timezoneOffset: extendedInfo.timezoneOffset,
                    fileName: extendedInfo.fileName,
                    cameraInfo: extendedInfo.cameraInfo,
                    source: extendedInfo.source,
                    geoLocation: extendedInfo.geoLocation
                };

                // Cache the result
                if (!this.imageSizeCache) this.imageSizeCache = {};
                this.imageSizeCache[photo.id] = sizeInfo;

                console.log(`📏 Got merged media info for photo ${photo.id}:`, sizeInfo);
                const uploadStatus = sizeInfo.uploadTimestamp ?
                    `upload: ${sizeInfo.uploadTimestamp}` : 'upload: not available';
                console.log(`🕐 Timestamps - taken: ${sizeInfo.timestamp}, ${uploadStatus}`);
                return sizeInfo;
            } else {
                console.warn(`⚠️ No complete data in API responses for photo ${photo.id}:`, { extendedInfo, batchInfo });
            }

            return null;
        } catch (error) {
            console.warn(`⚠️ Failed to get image size for photo ${photo.id}:`, error);
            return null;
        }
    }

    async extractMediaKeyFromPhoto(photo) {
        try {
            console.log(`🔍 Extracting media key for photo ${photo.id}...`);

            // Method 1: Photo ID might be the media key itself
            if (photo.id && photo.id.length > 20) {
                console.log(`📋 Using photo ID as media key: ${photo.id.substring(0, 20)}...`);
                return photo.id;
            }

            // Method 2: Try to find the photo element in the DOM
            const photoElements = document.querySelectorAll('[data-id], [jsdata], [data-ved]');

            for (const element of photoElements) {
                const elementId = element.getAttribute('data-id');
                if (elementId === photo.id) {
                    // Look for media key in various possible attributes
                    const mediaKey = element.getAttribute('data-media-key') ||
                        element.getAttribute('data-itemkey') ||
                        element.getAttribute('data-item-key') ||
                        element.getAttribute('jsdata') ||
                        element.getAttribute('data-ved');

                    if (mediaKey && mediaKey.length > 10) {
                        console.log(`📋 Found media key from DOM attribute for photo ${photo.id}: ${mediaKey.substring(0, 20)}...`);
                        return mediaKey;
                    }
                }
            }

            // Method 3: Extract from the photo URL
            const urlKey = await this.extractMediaKeyFromUrl(photo.url);
            if (urlKey) {
                console.log(`📋 Found media key from URL for photo ${photo.id}: ${urlKey.substring(0, 20)}...`);
                return urlKey;
            }

            // Method 4: Look for photo element by background image URL
            const bgKey = await this.extractMediaKeyFromBackgroundImage(photo.url);
            if (bgKey) {
                console.log(`📋 Found media key from background image for photo ${photo.id}: ${bgKey.substring(0, 20)}...`);
                return bgKey;
            }

            // Method 5: Try alternative ID formats
            const alternativeKey = await this.tryAlternativeMediaKeyFormats(photo);
            if (alternativeKey) {
                console.log(`📋 Found media key from alternative format for photo ${photo.id}: ${alternativeKey.substring(0, 20)}...`);
                return alternativeKey;
            }

            console.warn(`⚠️ Could not find media key for photo ${photo.id}`);
            return null;
        } catch (error) {
            console.warn(`❌ Error extracting media key for photo ${photo.id}:`, error);
            return null;
        }
    }

    async extractMediaKeyFromUrl(imageUrl) {
        try {
            // Try to extract media key from the image URL structure
            // DupeYak Duplicate Remover URLs sometimes contain encoded media keys

            // Pattern 1: Standard format with =w000-h000
            const urlMatch = imageUrl.match(/\/([A-Za-z0-9_-]{20,})=w\d+-h\d+/);
            if (urlMatch && urlMatch[1]) {
                return urlMatch[1];
            }

            // Pattern 2: Different URL patterns
            const altMatch = imageUrl.match(/\/([A-Za-z0-9_-]{20,})\?/);
            if (altMatch && altMatch[1]) {
                return altMatch[1];
            }

            // Pattern 3: Base64-like IDs in path
            const pathMatch = imageUrl.match(/\/([A-Za-z0-9_-]{20,})/);
            if (pathMatch && pathMatch[1] && !pathMatch[1].includes('photos')) {
                return pathMatch[1];
            }

            return null;
        } catch (error) {
            console.warn('Failed to extract media key from URL:', error);
            return null;
        }
    }

    async extractMediaKeyFromBackgroundImage(imageUrl) {
        try {
            // Find elements with background images matching this URL
            const elements = document.querySelectorAll('*');

            for (const element of elements) {
                const bgImage = window.getComputedStyle(element).backgroundImage;
                if (bgImage && bgImage.includes(imageUrl.substring(0, 50))) {
                    // Found the element, now look for data attributes
                    const mediaKey = element.getAttribute('data-id') ||
                        element.getAttribute('jsdata') ||
                        element.getAttribute('data-ved') ||
                        element.closest('[data-id]')?.getAttribute('data-id');

                    if (mediaKey && mediaKey.length > 10) {
                        return mediaKey;
                    }
                }
            }

            return null;
        } catch (error) {
            console.warn('Failed to extract media key from background image:', error);
            return null;
        }
    }

    async tryAlternativeMediaKeyFormats(photo) {
        try {
            // Sometimes the photo ID needs to be transformed

            // Method 1: Remove common prefixes/suffixes
            let cleanId = photo.id.replace(/^(photo|img|item)[-_]?/i, '');
            cleanId = cleanId.replace(/[-_]?(thumb|preview)$/i, '');

            if (cleanId !== photo.id && cleanId.length > 15) {
                return cleanId;
            }

            // Method 2: Look for the photo ID in the page source
            const pageHtml = document.documentElement.outerHTML;
            const idPattern = new RegExp(`["']([A-Za-z0-9_-]{20,})["'][^"']*${photo.id.substring(0, 10)}`, 'g');
            const matches = pageHtml.match(idPattern);

            if (matches && matches.length > 0) {
                const match = matches[0].match(/["']([A-Za-z0-9_-]{20,})["']/);
                if (match && match[1]) {
                    return match[1];
                }
            }

            // Method 3: Try the photo href if available
            if (photo.href) {
                const hrefMatch = photo.href.match(/\/photo\/([A-Za-z0-9_-]{20,})/);
                if (hrefMatch && hrefMatch[1]) {
                    return hrefMatch[1];
                }
            }

            return null;
        } catch (error) {
            console.warn('Failed to try alternative media key formats:', error);
            return null;
        }
    }

    async getItemInfoExt(mediaKey) {
        try {
            // Get DupeYak Duplicate Remover authentication data
            const authData = await this.getGooglePhotosAuthData();
            if (!authData) {
                throw new Error('Could not extract DupeYak Duplicate Remover authentication data');
            }

            // Prepare the RPC request for getItemInfoExt (fDcn4b)
            const rpcid = 'fDcn4b';
            const requestData = [mediaKey, 1, null, null, 1];

            const wrappedRequestData = [[[rpcid, JSON.stringify(requestData), null, 'generic']]];
            const requestDataString = `f.req=${encodeURIComponent(JSON.stringify(wrappedRequestData))}&at=${encodeURIComponent(authData.at)}&`;

            const params = {
                rpcids: rpcid,
                'source-path': window.location.pathname,
                'f.sid': authData['f.sid'],
                bl: authData.bl,
                pageId: 'none',
                rt: 'c',
            };

            if (authData.rapt) {
                params.rapt = authData.rapt;
            }

            const paramsString = Object.keys(params)
                .map(key => `${key}=${encodeURIComponent(params[key])}`)
                .join('&');

            const url = `https://photos.google.com${authData.path}data/batchexecute?${paramsString}`;

            const response = await fetch(url, {
                headers: {
                    'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
                },
                body: requestDataString,
                method: 'POST',
                credentials: 'include',
            });

            const responseBody = await response.text();
            const jsonLines = responseBody.split('\n').filter(line => line.includes('wrb.fr'));

            if (jsonLines.length === 0) {
                throw new Error('No valid response lines found');
            }

            const parsedData = JSON.parse(jsonLines[0]);
            const rawResponse = JSON.parse(parsedData[0][2]);

            // Parse the response similar to GPTK's itemInfoExtParse
            return this.parseItemInfoExt(rawResponse);

        } catch (error) {
            console.error('❌ Error getting item info ext:', error);
            throw error;
        }
    }

    async getBatchMediaInfo(mediaKeyArray) {
        try {
            // Get DupeYak Duplicate Remover authentication data
            const authData = await this.getGooglePhotosAuthData();
            if (!authData) {
                throw new Error('Could not extract DupeYak Duplicate Remover authentication data');
            }

            // Prepare the RPC request similar to GPTK
            const rpcid = 'EWgK9e';
            const formattedMediaKeys = mediaKeyArray.map(key => [key]);

            // Request data structure from GPTK
            const requestData = [[[formattedMediaKeys], [[null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [], null, null, null, null, null, null, null, null, null, null, []]]]];

            const wrappedRequestData = [[[rpcid, JSON.stringify(requestData), null, 'generic']]];
            const requestDataString = `f.req=${encodeURIComponent(JSON.stringify(wrappedRequestData))}&at=${encodeURIComponent(authData.at)}&`;

            const params = {
                rpcids: rpcid,
                'source-path': window.location.pathname,
                'f.sid': authData['f.sid'],
                bl: authData.bl,
                pageId: 'none',
                rt: 'c',
            };

            if (authData.rapt) {
                params.rapt = authData.rapt;
            }

            const paramsString = Object.keys(params)
                .map(key => `${key}=${encodeURIComponent(params[key])}`)
                .join('&');

            const url = `https://photos.google.com${authData.path}data/batchexecute?${paramsString}`;

            const response = await fetch(url, {
                headers: {
                    'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
                },
                body: requestDataString,
                method: 'POST',
                credentials: 'include',
            });

            const responseBody = await response.text();
            const jsonLines = responseBody.split('\n').filter(line => line.includes('wrb.fr'));

            if (jsonLines.length === 0) {
                throw new Error('No valid response lines found');
            }

            const parsedData = JSON.parse(jsonLines[0]);
            const rawResponse = JSON.parse(parsedData[0][2]);

            // Parse the response similar to GPTK's bulkMediaInfo parser
            return this.parseBulkMediaInfo(rawResponse);

        } catch (error) {
            console.error('❌ Error getting batch media info:', error);
            throw error;
        }
    }

    async getGooglePhotosAuthData() {
        try {
            // Return cached auth data if available
            if (this.authDataCache) {
                //console.log('📋 Using cached authentication data');
                return this.authDataCache;
            }

            //console.log('🔑 Extracting DupeYak Duplicate Remover authentication data...');

            // Method 1: Try to extract from existing script elements
            const authData = await this.extractAuthFromDomScripts();
            if (authData) {
                //console.log('✅ Successfully extracted auth data from DOM scripts');
                this.authDataCache = authData; // Cache the result
                return authData;
            }

            // Method 2: Try to extract from network requests
            const networkAuthData = await this.extractAuthFromNetworkRequests();
            if (networkAuthData) {
                //console.log('✅ Successfully extracted auth data from network requests');
                this.authDataCache = networkAuthData; // Cache the result
                return networkAuthData;
            }

            // Method 3: Use a simpler approach - extract common values
            const fallbackAuthData = await this.extractAuthDataFallback();
            if (fallbackAuthData) {
                //console.log('✅ Successfully extracted auth data using fallback method');
                this.authDataCache = fallbackAuthData; // Cache the result
                return fallbackAuthData;
            }

            console.warn('⚠️ Could not extract DupeYak Duplicate Remover authentication data');
            return null;

        } catch (error) {
            console.warn('⚠️ Failed to extract DupeYak Duplicate Remover auth data:', error);
            return null;
        }
    }

    async extractAuthFromDomScripts() {
        try {
            // Look for auth data in existing script elements
            const scripts = document.querySelectorAll('script');

            for (const script of scripts) {
                if (script.textContent) {
                    // Look for patterns that might contain auth data
                    const snlm0eMatch = script.textContent.match(/SNlM0e['"]\s*:\s*['"]([^'"]+)['"]/);
                    const fdrfjeMatch = script.textContent.match(/FdrFJe['"]\s*:\s*['"]([^'"]+)['"]/);
                    const cfb2hMatch = script.textContent.match(/cfb2h['"]\s*:\s*['"]([^'"]+)['"]/);
                    const eptzeMatch = script.textContent.match(/eptZe['"]\s*:\s*['"]([^'"]+)['"]/);

                    if (snlm0eMatch && fdrfjeMatch && cfb2hMatch && eptzeMatch) {
                        return {
                            at: snlm0eMatch[1],
                            'f.sid': fdrfjeMatch[1],
                            bl: cfb2hMatch[1],
                            path: eptzeMatch[1],
                            rapt: null, // May not be present
                            account: null // May not be present
                        };
                    }
                }
            }

            return null;
        } catch (error) {
            console.warn('Failed to extract auth from DOM scripts:', error);
            return null;
        }
    }

    async extractAuthFromNetworkRequests() {
        try {
            // Intercept network requests to extract auth tokens
            return new Promise((resolve) => {
                let authData = null;

                // Set up a temporary request interceptor
                const originalFetch = window.fetch;

                const interceptor = async function (...args) {
                    const result = await originalFetch.apply(this, args);

                    // Check if this is a DupeYak Duplicate Remover API request
                    if (args[0] && args[0].includes && args[0].includes('batchexecute')) {
                        try {
                            // Extract auth data from the request
                            const url = new URL(args[0]);
                            const params = new URLSearchParams(url.search);

                            if (params.get('at') && params.get('bl')) {
                                authData = {
                                    at: params.get('at'),
                                    'f.sid': params.get('f.sid') || '',
                                    bl: params.get('bl'),
                                    path: '/u/0/_/',
                                    rapt: params.get('rapt') || null,
                                    account: null
                                };

                                // Restore original fetch
                                window.fetch = originalFetch;
                                resolve(authData);
                                return result;
                            }
                        } catch (e) {
                            console.warn('Error extracting from request:', e);
                        }
                    }

                    return result;
                };

                // Temporarily replace fetch
                window.fetch = interceptor;

                // Set a timeout
                setTimeout(() => {
                    window.fetch = originalFetch;
                    resolve(null);
                }, 3000);
            });

        } catch (error) {
            console.warn('Failed to extract auth from network requests:', error);
            return null;
        }
    }

    async extractAuthDataFallback() {
        try {
            // Simplified approach: Try to make a test request and extract from response headers
            // or use known patterns in the page

            // Check for meta tags or data attributes that might contain auth info
            const metaElements = document.querySelectorAll('meta[name*="csrf"], meta[name*="token"], meta[content*="token"]');

            for (const meta of metaElements) {
                const content = meta.getAttribute('content');
                if (content && content.length > 10) {
                    // This might be an auth token
                    return {
                        at: content,
                        'f.sid': '',
                        bl: '',
                        path: '/u/0/_/',
                        rapt: null,
                        account: null
                    };
                }
            }

            // Last resort: return minimal auth data that might work
            return {
                at: '',
                'f.sid': '',
                bl: '',
                path: '/u/0/_/',
                rapt: null,
                account: null
            };

        } catch (error) {
            console.warn('Failed fallback auth extraction:', error);
            return null;
        }
    }

    parseBulkMediaInfo(data) {
        try {
            if (!data || !Array.isArray(data) || !data[0]) {
                console.warn('⚠️ Invalid API response structure:', data);
                return [];
            }

            // Based on the actual response structure:
            // data[0][1][0][1][3] = filename 
            // data[0][1][0][1][9] = size
            // data[0][1][0][1].at(-1)[0] = takesUpSpace (1 = true, 0 = false)
            // data[0][1][0][1].at(-1)[1] = spaceTaken (actual space used)
            // data[0][1][0][1].at(-1)[2] = isOriginalQuality (2 = original quality)
            const mediaInfo = data[0][1][0];
            const mediaKey = mediaInfo[0]; // "AF1QipNwY8Mp-chWTwJv2DcZAiZXKeKFHNhMGI8QPj9Q"
            const infoArray = mediaInfo[1]; // Array with 35 elements

            const fileName = infoArray[3]; // "IMG_2208.HEIC"
            const size = infoArray[9]; // 560263

            // Extract storage-related information (similar to GPTK)
            const storageInfo = infoArray?.at(-1); // Last element contains storage info
            const takesUpSpace = storageInfo?.[0] === undefined ? null : storageInfo[0] === 1;
            const spaceTaken = storageInfo?.[1];
            const isOriginalQuality = storageInfo?.[2] === undefined ? null : storageInfo[2] === 2;

            console.log(`📊 Extracted from API: fileName="${fileName}", size=${size} bytes, takesUpSpace=${takesUpSpace}, spaceTaken=${spaceTaken}, isOriginalQuality=${isOriginalQuality}`);

            const result = {
                mediaKey: mediaKey,
                fileName: fileName,
                size: size,
                takesUpSpace: takesUpSpace,
                spaceTaken: spaceTaken,
                isOriginalQuality: isOriginalQuality,
                creationTimestamp: infoArray[8],
                timestamp: infoArray[6],
                timezoneOffset: infoArray[7]
            };

            console.log(`✅ Final parsed result:`, result);
            return [result];

        } catch (error) {
            console.error('❌ Error parsing bulk media info:', error);
            return [];
        }
    }

    parseItemInfoExt(data) {
        try {
            if (!data || !Array.isArray(data) || !data[0]) {
                console.warn('⚠️ Invalid itemInfoExt API response structure:', data);
                return null;
            }

            const itemData = data[0];

            // Extract photo taken timestamp - upload timestamp not available in this API
            const photoTakenTimestamp = itemData?.[3]; // When photo was taken

            console.log(`🕐 Photo taken timestamp: ${photoTakenTimestamp}`);

            return {
                mediaKey: itemData?.[0],
                dedupKey: itemData?.[11],
                descriptionFull: itemData?.[1],
                fileName: itemData?.[2],
                timestamp: photoTakenTimestamp,           // Photo taken date
                timezoneOffset: itemData?.[4],
                size: itemData?.[5],
                resWidth: itemData?.[6],
                resHeight: itemData?.[7],
                cameraInfo: itemData?.[23],
                takesUpSpace: itemData?.[30]?.[0] === undefined ? null : itemData?.[30]?.[0] === 1,
                spaceTaken: itemData?.[30]?.[1],
                isOriginalQuality: itemData?.[30]?.[2] === undefined ? null : itemData?.[30]?.[2] === 2,
                geoLocation: {
                    coordinates: itemData?.[9]?.[0] || itemData?.[13]?.[0],
                    name: itemData?.[13]?.[2]?.[0]?.[1]?.[0]?.[0],
                },
                // Extract source information
                source: this.parseSourceInfo(itemData?.[27])
            };

        } catch (error) {
            console.error('❌ Error parsing item info ext:', error);
            return null;
        }
    }

    parseSourceInfo(sourceData) {
        try {
            if (!sourceData) return null;

            const sourceMap = {
                1: 'mobile',
                2: 'web',
                3: 'shared',
                4: 'partnerShared',
                7: 'drive',
                8: 'pc',
                11: 'gmail',
            };

            const sourceMapSecondary = {
                1: 'android',
                3: 'ios',
            };

            const source = [];
            source[0] = sourceData?.[0] ? sourceMap[sourceData[0]] : null;
            source[1] = sourceData?.[1]?.[2] ? sourceMapSecondary[sourceData[1][2]] : null;

            return source;
        } catch (error) {
            console.warn('Error parsing source info:', error);
            return null;
        }
    }

    formatDateTime(timestamp, timezoneOffset) {
        try {
            if (!timestamp) return '';

            // Convert timestamp to milliseconds if needed
            const timestampMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;

            // Create date object from the timestamp
            let date = new Date(timestampMs);

            // Apply timezone offset if provided
            // DupeYak Duplicate Remover API provides timezone offset in milliseconds
            // We need to adjust the UTC time to local time
            if (timezoneOffset !== undefined && timezoneOffset !== null) {
                // timezoneOffset is in milliseconds (e.g., 10800000 = 3 hours)
                // Subtract the offset to get the correct local time
                date = new Date(timestampMs - timezoneOffset);
            }

            // Format as dd.mm.yyyy hh:mm:ss
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');

            const formattedDate = `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;

            // Debug logging to verify the conversion
            console.log(`🕐 Timestamp conversion: ${timestamp} (${timezoneOffset}ms offset) → ${formattedDate}`);

            return formattedDate;
        } catch (error) {
            console.warn('Error formatting date:', error, 'timestamp:', timestamp, 'offset:', timezoneOffset);
            return '';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    clearAuthCache() {
        // Clear the authentication cache (useful if session changes)
        this.authDataCache = null;
        //console.log('🧹 Cleared authentication cache');
    }

    async loadImageSizes(overlay) {
        //console.log('📏 Setting up viewport-based image size loading...');

        // Clean up any existing observer and timers
        this.cleanupViewportObserver();

        // Set up intersection observer to watch for images entering viewport
        this.setupViewportObserver(overlay);

        //console.log('📏 Viewport-based image size loading initialized');
    }

    setupViewportObserver(overlay) {
        const imageItems = overlay.querySelectorAll('.pc-image-item');

        if (imageItems.length === 0) {
            //console.log('📏 No image items found, skipping viewport observer setup');
            return;
        }

        console.log(`📏 Setting up viewport observer for ${imageItems.length} image items`);

        // Create intersection observer with a small root margin to start loading slightly before visible
        this.viewportObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const imageItem = entry.target;
                const photoId = imageItem.getAttribute('data-photo-id');
                const imageSizeElement = imageItem.querySelector('.pc-image-size');

                if (entry.isIntersecting) {
                    // Image item entered viewport - start timer
                    console.log(`👁️ Image item ${photoId} entered viewport`);
                    this.startViewportTimer(imageSizeElement, photoId);
                } else {
                    // Image item left viewport - cancel timer
                    console.log(`👁️ Image item ${photoId} left viewport`);
                    this.cancelViewportTimer(photoId);
                }
            });
        }, {
            root: null, // Use viewport as root
            rootMargin: '50px', // Start loading 50px before entering viewport
            threshold: 0.1 // Trigger when 10% of element is visible
        });

        // Observe all image items
        imageItems.forEach(imageItem => {
            this.viewportObserver.observe(imageItem);
        });

        console.log(`📏 Viewport observer observing ${imageItems.length} image items`);
    }

    startViewportTimer(element, photoId) {
        // Cancel any existing timer for this photo
        this.cancelViewportTimer(photoId);

        if (!element) {
            console.warn(`⚠️ No image size element found for photo ${photoId}`);
            return;
        }

        // Check if size is already displayed in the UI
        const currentContent = element.innerHTML?.trim();
        if (currentContent &&
            (currentContent.includes('color: #666') || currentContent.includes('pc-size-info')) &&
            !currentContent.includes('Loading...')) {
            console.log(`✅ Photo ${photoId} size already displayed, no timer needed`);
            return;
        }

        // Check if size is already cached - if so, display immediately without timer
        if (this.imageSizeCache && this.imageSizeCache[photoId]) {
            const sizeInfo = this.imageSizeCache[photoId];
            this.displaySizeInfo(element, sizeInfo);
            console.log(`💾 Photo ${photoId} size displayed immediately from cache:`, sizeInfo);
            return;
        }

        console.log(`👁️ Photo ${photoId} entered viewport, starting 500ms timer...`);

        // Set loading indicator
        element.textContent = 'Loading...';
        element.style.color = '#999';
        element.style.fontSize = '0.8em';
        element.style.fontStyle = 'italic';

        // Start timer for 500ms
        const timer = setTimeout(async () => {
            console.log(`⏰ 500ms timer expired for photo ${photoId}, loading size...`);
            await this.loadImageSizeForElement(element, photoId);
        }, 500);

        this.viewportTimers.set(photoId, timer);
    }

    cancelViewportTimer(photoId) {
        const timer = this.viewportTimers.get(photoId);
        if (timer) {
            clearTimeout(timer);
            this.viewportTimers.delete(photoId);
            console.log(`⏹️ Cancelled viewport timer for photo ${photoId}`);
        }
    }

    async loadImageSizeForElement(element, photoId) {
        // Check if size is already displayed in the UI
        const currentContent = element.innerHTML?.trim();
        if (currentContent &&
            (currentContent.includes('color: #666') || currentContent.includes('pc-size-info')) &&
            !currentContent.includes('Loading...')) {
            console.log(`✅ Photo ${photoId} size already displayed, skipping...`);
            return;
        }

        // Check if size is already cached (additional optimization)
        if (this.imageSizeCache && this.imageSizeCache[photoId]) {
            const sizeInfo = this.imageSizeCache[photoId];
            this.displaySizeInfo(element, sizeInfo);
            console.log(`💾 Photo ${photoId} size loaded from cache:`, sizeInfo);
            return;
        }

        // Check if we're already loading this image
        if (this.imageSizeLoaders.has(photoId)) {
            console.log(`🔄 Already loading size for photo ${photoId}, skipping...`);
            return;
        }

        // Mark as loading
        this.imageSizeLoaders.set(photoId, true);

        try {
            // Find the media item - check both photos and videos arrays
            let mediaItem = this.photos.find(p => p.id === photoId);
            let mediaType = 'photo';

            if (!mediaItem) {
                mediaItem = this.videos.find(v => v.id === photoId);
                mediaType = 'video';
            }

            if (!mediaItem) {
                console.warn(`⚠️ Media item ${photoId} not found in photos or videos array`);
                element.textContent = '';
                return;
            }

            console.log(`📏 Loading size for ${mediaType} ${photoId}...`);
            const sizeInfo = await this.getOriginalImageSize(mediaItem);

            if (sizeInfo) {
                this.displaySizeInfo(element, sizeInfo);
                console.log(`✅ Loaded size for ${mediaType} ${photoId}:`, sizeInfo);
            } else {
                element.innerHTML = '';
                element.style.fontStyle = 'normal';
                console.log(`⚠️ Could not get size for ${mediaType} ${photoId}`);
            }
        } catch (error) {
            console.warn(`❌ Error loading size for photo ${photoId}:`, error);
            element.innerHTML = '';
            element.style.fontStyle = 'normal';
        } finally {
            // Remove from loading set
            this.imageSizeLoaders.delete(photoId);
        }
    }

    displaySizeInfo(element, sizeInfo) {
        // Also update the photo label with resolution and date
        const imageItem = element.closest('.pc-image-item');
        const photoLabel = imageItem?.querySelector('p');

        // Handle both old string format (for backward compatibility) and new object format
        if (typeof sizeInfo === 'string') {
            // Old format - just display the size string
            element.innerHTML = `<div class="pc-size-info" style="color: #666; font-size: 0.9em; margin: 0; padding: 0;">(${sizeInfo})</div>`;
            return;
        }

        // Create multi-line display format
        let html = '';

        // Line 1: Resolution and taken date
        if (sizeInfo.resWidth && sizeInfo.resHeight && sizeInfo.timestamp) {
            const resolution = `${sizeInfo.resWidth}x${sizeInfo.resHeight}`;
            const takenDateTime = this.formatDateTime(sizeInfo.timestamp, sizeInfo.timezoneOffset);

            html += `<div style="color: #333; font-size: 0.9em; margin: 0; padding: 0; text-align: center; font-weight: normal;">${resolution}, ${takenDateTime}</div>`;
        }

        // Line 2: Upload date (if available and different from taken date)
        if (sizeInfo.uploadTimestamp && sizeInfo.uploadTimestamp !== sizeInfo.timestamp) {
            const uploadDateTime = this.formatDateTime(sizeInfo.uploadTimestamp, sizeInfo.timezoneOffset);
            html += `<div style="color: #333; font-size: 0.9em; margin: 0; padding: 0; text-align: center; font-weight: normal;">uploaded ${uploadDateTime}</div>`;
        }

        // Line 3: File size and storage information
        let storageText = `(${sizeInfo.formatted}) `;
        let storageColor = '#666';

        // Add storage notice based on whether photo takes up space
        if (sizeInfo.takesUpSpace === false) {
            storageText += `not taking space`;
            storageColor = '#28a745';
        } else if (sizeInfo.takesUpSpace === true && sizeInfo.spaceTaken) {
            const spaceTakenFormatted = this.formatFileSize(sizeInfo.spaceTaken);
            storageText += `takes ${spaceTakenFormatted}`;
            storageColor = '#ff6b35';
        }

        html += `<div class="pc-size-info" style="color: ${storageColor}; font-size: 0.9em; margin: 0; padding: 0; text-align: center;">${storageText}</div>`;

        // Replace photo label content and add our multi-line info
        if (photoLabel) {
            photoLabel.innerHTML = '';
            photoLabel.style.display = 'none'; // Hide original label
        }

        element.innerHTML = html;
        element.style.fontStyle = 'normal';

        console.log(`📝 Updated photo info with multi-line format`);
    }

    cleanupViewportObserver() {
        // Clean up existing observer
        if (this.viewportObserver) {
            this.viewportObserver.disconnect();
            this.viewportObserver = null;
            //console.log('🧹 Cleaned up viewport observer');
        }

        // Clear all timers
        this.viewportTimers.forEach((timer, photoId) => {
            clearTimeout(timer);
            console.log(`🧹 Cleared timer for photo ${photoId}`);
        });
        this.viewportTimers.clear();

        // Clear loading set
        this.imageSizeLoaders.clear();

        //console.log('🧹 Cleaned up all viewport timers and loading states');
    }

    convertToFullResolution(thumbnailUrl) {
        try {
            // Convert thumbnail URL to full resolution
            // From: https://photos.fife.usercontent.google.com/pw/...=w256-h192-no?authuser=0
            // To:   https://photos.fife.usercontent.google.com/pw/...=w1200-h1200-no?authuser=0

            // Extract base URL (everything before the =w part)
            const baseUrlMatch = thumbnailUrl.match(/^(.+)=w\d+-h\d+(-[^?]+)?(\?.*)?$/);
            if (baseUrlMatch) {
                const baseUrl = baseUrlMatch[1];
                const suffix = baseUrlMatch[2] || '-no'; // Keep the suffix (like -no, -k-rw-no)
                const queryParams = baseUrlMatch[3] || '';

                // Use a good resolution for comparison (not too large to avoid memory issues)
                const fullResUrl = `${baseUrl}=w1200-h1200${suffix}${queryParams}`;

                console.log(`Converted thumbnail to full-res: ${thumbnailUrl.substring(0, 80)}... -> ${fullResUrl.substring(0, 80)}...`);
                return fullResUrl;
            }

            // If pattern doesn't match, return original URL
            console.warn('Could not convert URL to full resolution, using original:', thumbnailUrl.substring(0, 100));
            return thumbnailUrl;

        } catch (error) {
            console.error('Error converting to full resolution:', error);
            return thumbnailUrl;
        }
    }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'purchaseCompleted') {
        //console.log('💰 Purchase completed, updating paid status...');
        if (window.photoCleanerInstance) {
            window.photoCleanerInstance.setPaidStatus(message.isPaidVersion);
        }
        sendResponse({ success: true });
    }

    // Debug message handlers
    else if (message.action === 'debugStatus') {
        if (window.photoCleanerInstance) {
            window.photoCleanerInstance.showDebugStatus();
            sendResponse({
                success: true,
                isPaidVersion: window.photoCleanerInstance.isPaidVersion,
                todaySimilarGroupsShown: window.photoCleanerInstance.todaySimilarGroupsShown,
                dailySimilarGroupsLimit: window.photoCleanerInstance.dailySimilarGroupsLimit,
                todayReAnalysisCount: window.photoCleanerInstance.todayReAnalysisCount,
                dailyReAnalysisLimit: window.photoCleanerInstance.dailyReAnalysisLimit,
                canShowMoreSimilarGroups: window.photoCleanerInstance.canShowMoreSimilarGroups(),
                canPerformReAnalysis: window.photoCleanerInstance.canPerformReAnalysis(),
                remainingGroupsToday: window.photoCleanerInstance.getRemainingGroupsToday(),
                remainingReAnalysisToday: window.photoCleanerInstance.getRemainingReAnalysisToday()
            });
        } else {
            sendResponse({ success: false, error: 'Extension not initialized' });
        }
    }

    else if (message.action === 'resetDailyLimits') {
        if (window.photoCleanerInstance) {
            window.photoCleanerInstance.resetDailyLimits();
            sendResponse({ success: true, message: 'Daily limits reset' });
        } else {
            sendResponse({ success: false, error: 'Extension not initialized' });
        }
    }

    else if (message.action === 'setGroupCount') {
        if (window.photoCleanerInstance) {
            window.photoCleanerInstance.setGroupCount(message.count);
            sendResponse({ success: true, message: `Group count set to ${message.count}` });
        } else {
            sendResponse({ success: false, error: 'Extension not initialized' });
        }
    }

    else if (message.action === 'setReAnalysisCount') {
        if (window.photoCleanerInstance) {
            window.photoCleanerInstance.setReAnalysisCount(message.count);
            sendResponse({ success: true, message: `Re-analysis count set to ${message.count}` });
        } else {
            sendResponse({ success: false, error: 'Extension not initialized' });
        }
    }

    else if (message.action === 'clearProStatus') {
        if (window.photoCleanerInstance) {
            window.photoCleanerInstance.clearProStatus();
            sendResponse({ success: true, message: 'Pro status cleared' });
        } else {
            sendResponse({ success: false, error: 'Extension not initialized' });
        }
    }

    else if (message.action === 'setProStatus') {
        if (window.photoCleanerInstance) {
            window.photoCleanerInstance.testPurchase();
            sendResponse({ success: true, message: 'Pro status set' });
        } else {
            sendResponse({ success: false, error: 'Extension not initialized' });
        }
    }

    else if (message.action === 'paymentStatusUpdated') {
        //console.log('💰 Payment status updated, refreshing from storage...');
        if (window.photoCleanerInstance) {
            window.photoCleanerInstance.loadPaidStatus();
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, error: 'Extension not initialized' });
        }
    }

    // Return true to indicate we'll send a response asynchronously
    return true;
});

// Initialize extension based on URL pattern
function initializeExtension() {
    //console.log('🔧 initializeExtension() called');
    //console.log('   Document ready state:', document.readyState);
    //console.log('   Current URL:', window.location.href);

    const currentUrl = window.location.href;
    const isGooglePhotos = currentUrl.includes('photos.google.com/');
    const isValidPage = isValidGooglePhotosPage(currentUrl);

    //console.log('   Is DupeYak Duplicate Remover?:', isGooglePhotos);
    //console.log('   Is Valid Page?:', isValidPage);

    if (!isGooglePhotos) {
        //console.log('❌ Not on DupeYak Duplicate Remover, skipping extension initialization');
        return;
    }

    // Clean up any existing instances
    cleanupExistingExtension();

    if (isValidPage) {
        //console.log('✅ On DupeYak Duplicate Remover valid page (search/album/share) - initializing full functionality');
        window.photoCleanerInstance = new PhotoExtractor();

        // Add global debug helper
        window.pcDebug = {
            status: () => window.photoCleanerInstance?.showDebugStatus(),
            resetLimits: () => window.photoCleanerInstance?.resetDailyLimits(),
            setGroupCount: (count) => window.photoCleanerInstance?.setGroupCount(count),
            setReAnalysisCount: (count) => window.photoCleanerInstance?.setReAnalysisCount(count),
            clearPro: () => window.photoCleanerInstance?.clearProStatus(),
            setPro: () => window.photoCleanerInstance?.testPurchase(),
            instance: () => window.photoCleanerInstance
        };

        //console.log('🛠️ Debug helper available: window.pcDebug');
        //console.log('   Usage: pcDebug.status(), pcDebug.resetLimits(), pcDebug.setGroupCount(2), pcDebug.setReAnalysisCount(1), etc.');
    } else {
        //console.log('ℹ️ On DupeYak Duplicate Remover but not valid page (search/album/share) - showing info message');
        showInfoMessage();
    }
}

// Clean up existing extension elements
function cleanupExistingExtension() {
    // Remove existing instance
    if (window.photoCleanerInstance) {
        //console.log('🧹 Cleaning up existing extension instance');
        if (typeof window.photoCleanerInstance.closePanel === 'function') {
            window.photoCleanerInstance.closePanel();
        }
        window.photoCleanerInstance = null;
    }

    // Remove any existing UI elements
    const elementsToRemove = [
        'photo-cleaner-panel',
        'pc-floating-status',
        'pc-screenshot-area',
        'pc-info-message',
        'pc-viewport-resize-message',
        'pc-window-warning'
    ];

    elementsToRemove.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    });
}

// Show info message for non-search DupeYak Duplicate Remover pages
//convert to jquery
function showInfoMessage() {
    // Don't show if already exists
    if ($('#pc-info-message').length) {
        return;
    }

    // Don't show if user has dismissed it in this session
    if (window.infoMessageDismissed) {
        return;
    }
   const newMagnifierIconUrl = chrome.runtime.getURL('../icons/magnifier.svg');
    const infoMessage = $(`
        <div id="pc-info-message" class="pc-info-message">
            <div class="pc-info-content !bg-[#e6f4ff] rounded-[20px] p-4 relative  ml-auto !border-[#addaff] border shadow-[4px_4px_8px_#f5f8ff]">
                <div class="pc-info-icon">
                    <a href="#" class="rounded-[10px] flex items-center gap-[5px] font-bold dark-color">
                        <span class="rounded-[10px] new-Magnifier flex w-[40px] max-[767px]:w-[45px] items-center justify-center"><img class="new-Magnifier" src="icons/tricon128.png" alt="logo"></span>
                    </a>
                </div>
                <div class="pc-info-text  colorone font16 font-normal	">
                    To check for duplicate or similar photos, go to an album, shared album, or search results  page and use the duplicate finder
                </div>
                <button href="#" id="pc-close" class="pc-info-close font-semibold w-[30px] h-[30px] !rounded-full !bg-white flex justify-center items-center">
                    <i class="fa-solid fa-xmark text-white"></i>
                </button>
            </div>
        </div>
    `);
     infoMessage.find('.new-Magnifier').attr('src', newMagnifierIconUrl);
     //   panel.find('.play-img').attr('src', playIconUrl);
    // Add close event
    infoMessage.find('.pc-info-close').on('click', function () {
        infoMessage.remove();
        window.infoMessageDismissed = true;
        //console.log('ℹ️ Info message closed and dismissed for this session');
    });

    // Append to body
    $('body').append(infoMessage);
    //console.log('ℹ️ Info message displayed');
}


// Initialize when page loads
//console.log('📋 Setting up extension initialization...');
//console.log('   Document ready state:', document.readyState);

// if (document.readyState === 'loading') {
//     //console.log('🔄 Document still loading, adding DOMContentLoaded listener...');
//     document.addEventListener('DOMContentLoaded', () => {
//         //console.log('🎯 DOMContentLoaded event fired, calling initializeExtension...');
//         initializeExtension();
//     });
// } else {
//     //console.log('🚀 Document already loaded, calling initializeExtension immediately...');
//     initializeExtension();
// }

//convert to jquery

$(document).ready(function () {
    initializeExtension();
});

// Re-initialize on navigation (for SPA behavior)
//console.log('🔍 Setting up SPA navigation observer...');
let lastUrl = location.href;

// Enhanced URL change detection for PWA
function setupUrlChangeDetection() {
    // Method 1: MutationObserver for DOM changes
    const observer = new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            //console.log('🌐 URL changed via MutationObserver from:', lastUrl);
            //console.log('                                    to:', url);
            lastUrl = url;
            handleUrlChange();
        }
    });

    observer.observe(document, { subtree: true, childList: true });

    // Method 2: Intercept history API for PWA navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
        originalPushState.apply(history, args);
        setTimeout(() => {
            const url = location.href;
            if (url !== lastUrl) {
                //console.log('🌐 URL changed via pushState from:', lastUrl);
                //console.log('                              to:', url);
                lastUrl = url;
                handleUrlChange();
            }
        }, 100);
    };

    history.replaceState = function (...args) {
        originalReplaceState.apply(history, args);
        setTimeout(() => {
            const url = location.href;
            if (url !== lastUrl) {
                //console.log('🌐 URL changed via replaceState from:', lastUrl);
                //console.log('                                  to:', url);
                lastUrl = url;
                handleUrlChange();
            }
        }, 100);
    };

    // Method 3: Listen for popstate events (back/forward buttons)
    window.addEventListener('popstate', () => {
        setTimeout(() => {
            const url = location.href;
            if (url !== lastUrl) {
                //console.log('🌐 URL changed via popstate from:', lastUrl);
                //console.log('                               to:', url);
                lastUrl = url;
                handleUrlChange();
            }
        }, 100);
    });
}

function handleUrlChange() {
    // Debounce multiple rapid URL changes
    clearTimeout(window.urlChangeTimer);
    window.urlChangeTimer = setTimeout(() => {
        //console.log('⏰ Processing URL change, calling initializeExtension...');
        initializeExtension();
    }, 500); // Shorter delay for better responsiveness
}

setupUrlChangeDetection();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTempElementInfo') {
        const extractor = window.photoCleanerInstance;
        if (extractor) {
            const elementInfo = extractor.getTempElementInfo(request.elementId);
            sendResponse(elementInfo);
        } else {
            sendResponse(null);
        }
        return true; // Will respond asynchronously
    }
});

async function getUserData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['userEmail', 'userId'], (result) => {
            resolve(result);
        });
    });
}

// Test hash computation when library loads
window.addEventListener('load', () => {
    setTimeout(async () => {
        if (typeof window.phash !== 'undefined' && typeof window.ahash !== 'undefined') {
            //console.log('✅ ImageHash library functions available:', {
            //     phash: typeof window.phash,
            //     ahash: typeof window.ahash,
            //     dhash: typeof window.dhash,
            //     whash: typeof window.whash,
            //     ImageHash: typeof window.ImageHash
            // });

            // Test with a simple image
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 100;
                canvas.height = 100;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(0, 0, 100, 100);

                const img = new Image();
                img.onload = async () => {
                    try {
                        //console.log('🧪 Testing hash computation...');
                        const testHash = await window.phash(img, 8);
                        //console.log('✅ Hash computation test successful:', testHash.toString());
                    } catch (error) {
                        console.error('❌ Hash computation test failed:', error);
                    }
                };
                img.src = canvas.toDataURL();
            } catch (error) {
                console.error('❌ Failed to create test image:', error);
            }
        } else {
            // //console.log('⚠️ ImageHash library functions not yet available - checking again...');
            // Check what's actually loaded
            // //console.log('🔍 Global scope check:', {
            //     phash: typeof window.phash,
            //     ahash: typeof window.ahash,
            //     dhash: typeof window.dhash,
            //     whash: typeof window.whash,
            //     ImageHash: typeof window.ImageHash,
            //     windowKeys: Object.keys(window).filter(k => k.includes('hash')),
            // });
        }
    }, 2000); // Reduced timeout for custom library
});

// //console.log('🚀 Frontend Session Manager initialized - server replacement active');
// //console.log('🚀 Frontend Session Manager initialized - server replacement active');