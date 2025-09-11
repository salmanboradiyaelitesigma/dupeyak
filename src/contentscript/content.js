
// DupeYak Duplicate Remover Duplicate Remover - Content Script
// Runs on:
// - https://photos.google.com/search/* and https://photos.google.com/u/*/search/* pages
// - https://photos.google.com/album/* and https://photos.google.com/u/*/album/* pages  
// - https://photos.google.com/share/* and https://photos.google.com/u/*/share/* pages


 import $ from 'jquery';
 import 'jquery-ui-dist/jquery-ui';
import * as faceapi from 'face-api.js';
 
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
            if (typeof window.ImageMatcher !== 'undefined') {
                this.imageMatcher = new window.ImageMatcher();
                this.imageMatcherLoaded = true;
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
            imageHashes: {},
            total_images: 0,
            processed_images: 0,
            analysis_status: 'ready',
            similar_groups: [],
            quality_array:[],
            last_analysis: null,
            similarity_threshold: 85
        };

        this.sessions[sessionId] = session;
        this.currentSessionId = sessionId;
        return sessionId;
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    async addImage(sessionId, imageId, imageData,photo_url) {
        const session = this.sessions[sessionId];
        if (!session) {
            return { success: false, error: 'Session not found' };
        }

        if (session.status !== 'active') {
            return { success: false, error: 'Session is not active' };
        }

        try {

            // Use base64 data URL directly for console output (more reliable than blob URLs)
            const base64DataUrl = imageData; 
            const mimeType = imageData.match(/data:([^;]+)/)?.[1] || 'image/png';
            const base64Size = Math.round((imageData.length * 3) / 4); 
            this.displayImageInConsole(imageId, base64DataUrl, base64Size, mimeType);
            const img = await this.createImageFromBase64(imageData);
            await this.waitForImageMatcher();
            const frontendStartTime = Date.now();
            const fingerprint = await this.imageMatcher.processImage(img, imageId);
            const frontendHashTime = Date.now() - frontendStartTime;
            const imageInfo = {
                id: imageId,
                added_at: new Date().toISOString(),
                processed: true,
                width: img.naturalWidth,
                height: img.naturalHeight,
                hash_cached: true,
                imageData: imageData,
                 photo_url: photo_url  
            };

            session.images.push(imageInfo);
            session.imageHashes[imageId] = fingerprint;
            session.total_images = session.images.length;

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
 async calculateImageHash(imageFile) {
  return new Promise((resolve, reject) => {
    if (
      !imageFile ||
      !imageFile.type?.startsWith("image/") ||
      !imageFile.size ||
      !imageFile.name
    ) {
      return reject(new Error("Invalid file object or not an image"));
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(imageFile);

    img.onload = () => {
      try {
        // Prepare canvas
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const size = 300;
        canvas.width = size;
        canvas.height = size;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        // Generate hash
        const hash = this.calculatePerceptualHash(data);

        resolve(hash);
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image: ${imageFile.name}`));
    };

    img.src = objectUrl;
  });
}
 calculatePerceptualHash(imageData) {
  const grayscale = [];
  for (let i = 0; i < imageData.length; i += 4) {
    const gray = Math.round(
      0.299 * imageData[i] +
      0.587 * imageData[i + 1] +
      0.114 * imageData[i + 2]
    );
    grayscale.push(gray);
  }

  // Calculate median instead of average for better distribution
  const sortedGrayscale = grayscale.slice().sort((a, b) => a - b);
  const median = sortedGrayscale[Math.floor(sortedGrayscale.length / 2)];

  // Generate hash string using median threshold
  let hash = '';
  for (let i = 0; i < grayscale.length; i++) {
    hash += grayscale[i] > median ? '1' : '0';
  }
  return hash;
}

  base64ToFile(base64Data, fileName, mimeType) {
  const arr = base64Data.split(',');
  const bstr = atob(arr[1]); // decode base64
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], fileName, { type: mimeType });
}

async  urlToFile(url, fileName, mimeType) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], fileName, { type: mimeType || blob.type });
}

    async createImageFromBase64(base64Data) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const timeout = 5000; 

            const timer = setTimeout(() => {
                console.error('❌ Image creation timeout');
                reject(new Error('Image creation timeout'));
            }, timeout);

            img.onload = () => {
                clearTimeout(timer);
                resolve(img);
            };

            img.onerror = (error) => {
                clearTimeout(timer);
                console.error('❌ Image creation failed:', error);
                reject(error);
            };

            img.crossOrigin = 'anonymous';
            img.src = base64Data;
        });
    }

    validateHashQuality(hexHash) {
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
    if (!session) throw new Error('Session not found');
    const analysisStartTime = Date.now();
    const allResults = [];

    session.analysis_status = 'analyzing';
    session.similarity_threshold = similarityThreshold;
    session.processed_images = 0;

    const threshold = similarityThreshold / 100.0;

    try {
        const images = session.images;
        const totalImages = images.length;
        const totalComparisons = totalImages * (totalImages - 1) / 2;

        const comparisons = [];
        let completedComparisons = 0;
        const batchSize = 1000;
        let batchCount = 0;

        const progressCallback = this.progressCallback || (() => {});

        // Hash comparison phase
        progressCallback(10, `Comparing ${totalComparisons.toLocaleString()} hash pairs...`);

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
                            similarity
                        });
                     }
                }

                completedComparisons++;
                batchCount++;

                if (batchCount >= batchSize) {
                    const progress = 10 + (completedComparisons / totalComparisons) * 80;
                    session.processed_images = completedComparisons;
                    session.analysis_progress = progress;
                    progressCallback(progress, `Comparing hashes: ${completedComparisons}/${totalComparisons} (${comparisons.length} matches found)`);

                    await new Promise(resolve => setTimeout(resolve, 1));
                    batchCount = 0;
                }
            }
        }

        // Final comparison update
        session.analysis_progress = 90;
        // progressCallback(95, `Grouping ${comparisons.length} similar pairs...`);
          const similarGroups = this.groupSimilarImages(comparisons);
        const newParamsList = await buildNewParamsFromSession(session);
        const totalQuality = newParamsList.length;
        let completedQuality = 0;

        const qualityResults = [];

        for (const new_params of newParamsList) {
            const tick = setInterval(() => {
                const baseProgress = 90 + (completedQuality / totalQuality) * 10;
                if (session.analysis_progress < baseProgress + 0.5) {
                session.analysis_progress += 0.5;
                progressCallback(session.analysis_progress, "Still analyzing faces...");
                }
            }, 500);

            const quality = await this.assessImageQuality(new_params, 500);
            clearInterval(tick);

            completedQuality++;
            const progress = 90 + (completedQuality / totalQuality) * 10;
            session.analysis_progress = progress;
            progressCallback(progress, `Quality analysis: ${completedQuality}/${totalQuality}`);

            qualityResults.push({
                name: new_params.name,
                ...quality
            });
        }
            allResults.push(...qualityResults);



        // Update session
        session.analysis_status = 'completed';
        session.processed_images = totalImages;
        session.similar_groups = similarGroups;
        session.quality_array = allResults;
        session.total_comparisons = totalComparisons;
        session.similar_pairs_found = comparisons.length;
        session.last_analysis = new Date().toISOString();
        session.analysis_progress = 100;
        progressCallback(100, `Analysis complete! Found ${similarGroups.length} groups.`);

        const analysisTime = Date.now() - analysisStartTime;

        return {
            success: true,
            session_id: sessionId,
            total_images: totalImages,
            similar_groups: similarGroups,
            quality_array: allResults,
            total_comparisons: totalComparisons,
            similar_pairs_found: comparisons.length,
            analysis_time: analysisTime
        };

    } catch (error) {
        console.error(`❌ Error during analysis:`, error);
        session.analysis_status = 'error';
        session.error = error.message;
        throw error;
    }

    // Helper functions
    function base64ToBlob(dataURL) {
        const [meta, base64Data] = dataURL.split(',');
        const mime = meta.match(/:(.*?);/)[1];
        const byteString = atob(base64Data);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) {
            uint8Array[i] = byteString.charCodeAt(i);
        }
        return new Blob([uint8Array], { type: mime });
    }

    async function buildNewParamsFromSession(session) {
        return Promise.all(session.images.map(async img => {
            const blob = base64ToBlob(img.imageData);
            return {
                blob,
                id: `${img.id}-${blob.size}-${Date.now()}`,
                preview: URL.createObjectURL(blob),
                lastModified: Date.now(),
                lastModifiedDate: new Date(),
                name: `${img.id}.jpg`,
                size: blob.size,
                type: blob.type,
                webkitRelativePath: ""
            };
        }));
    }
}


faceapiInitialized = false;

 async initializeFaceApi() {
   if (this.faceapiInitialized) {
    return;
  } 

  try {
    const modelUrl = chrome.runtime.getURL("models");
    await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelUrl);

    this.faceapiInitialized = true; 
  } catch (error) {
    console.error('❌ Failed to load face-api.js models:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));

    this.faceapiInitialized = false; 
  }
}

  async assessImageQuality(imageFile, processingSize = 500) {
     await this.initializeFaceApi();

    const technical = await this.analyzeTechnicalQuality(imageFile, processingSize);
    const faces = await this.analyzeFaceQuality(imageFile);
    const overallScore = this.calculateOverallScore(technical, faces);
    const qualityTier = this.getQualityTier(overallScore);

    return {
      overallScore,
      qualityTier,
      technical,
      faces,
    };
  }

 // FOR_similarity_groups_changes
calculateRelativeQualityRanks(group) {
    const sortedFiles = [...group.files].sort((a, b) => b.qualityAssessment.overallScore - a.qualityAssessment.overallScore);
    sortedFiles.forEach((file, idx) => {
        if (sortedFiles.length <= 10) file.relativeQualityRank = 10 - idx;
        else {
            const step = 9 / (sortedFiles.length - 1);
            const rank = 10 - idx * step;
            file.relativeQualityRank = Math.max(1, Math.round(rank * 10) / 10);
        }
    });
}

  analyzeTechnicalQuality(imageFile, processingSize=500) {
    return new Promise((resolve, reject) => {
      if (!imageFile || !imageFile.type || !imageFile.type.startsWith('image/') || !imageFile.size || !imageFile.name) {
        reject(new Error('Invalid file object or not an image'));
        return;
      }

      const img = new Image();
      let objectUrl = null;

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          canvas.width = processingSize;
          canvas.height = processingSize;

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, processingSize, processingSize);

          const imageData = ctx.getImageData(0, 0, processingSize, processingSize);

          const blurScore = this.calculateBlurScore(imageData);
          const exposureQuality = this.calculateExposureQuality(imageData);
          const contrastScore = this.calculateContrastScore(imageData);
          const noiseLevel = this.calculateNoiseLevel(imageData);
          const sharpnessScore = this.calculateSharpnessScore(imageData);
          const colorBalance = this.calculateColorBalance(imageData);

          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
          }

          resolve({
            blurScore,
            exposureQuality,
            contrastScore,
            noiseLevel,
            sharpnessScore,
            colorBalance,
          });
        } catch (error) {
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
          }
          reject(error);
        }
      };

      img.onerror = (error) => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        reject(error);
      };

      try {
        objectUrl = URL.createObjectURL(imageFile.blob);
        img.src = objectUrl;
      } catch (error) {
        reject(new Error(`Failed to create object URL for file: ${imageFile.name}`));
      }
    });
  }

  async analyzeFaceQuality(imageFile) {
    if (!this.faceapiInitialized) {
      return undefined;
    }

    try {
      const img = await this.loadImageElement(imageFile);
      let detectionsWithLandmarks = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({
        scoreThreshold: 0.5,
          inputSize: 416
      })).withFaceLandmarks(true);

      if (detectionsWithLandmarks.length === 0) {
        detectionsWithLandmarks = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({
          scoreThreshold: 0.1,
          inputSize: 608
        })).withFaceLandmarks(true);
      }

      if (detectionsWithLandmarks.length === 0) {
        detectionsWithLandmarks = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({
          scoreThreshold: 0.30,
          inputSize: 512
       
        })).withFaceLandmarks(true);
      };
      if (detectionsWithLandmarks.length === 0) {
        return undefined;
      }

      const faceWithLandmarks = detectionsWithLandmarks[0];
      const box = faceWithLandmarks.detection.box;
      const landmarks = faceWithLandmarks.landmarks;

      const faceSize = this.calculateFaceSize(box, img.width, img.height);
      const faceCentering = this.calculateFaceCentering(box, img.width, img.height);
      const lightingQuality = await this.calculateFaceLighting(img, box);
      const eyeContactScore = this.calculateEyeContactScore(landmarks);
      const portraitScore = (faceSize + faceCentering + lightingQuality + eyeContactScore) / 4;

      return {
        faceCount: detectionsWithLandmarks.length,
        eyeContactScore,
        faceCentering,
        faceSize,
        lightingQuality,
        portraitScore,
      };
    } catch (error) {
      console.error('Face detection with landmarks failed:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      return undefined;
    }
  }

  async detectFaceSimplified(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = 300;
    canvas.height = 300;

    ctx.drawImage(img, 0, 0, 300, 300);
    const imageData = ctx.getImageData(0, 0, 300, 300);

    const faceIndicators = this.calculateFaceIndicators(imageData);

    const hasFace = faceIndicators.confidence > 0.3;

    if (!hasFace) {
      return {
        hasFace: false,
        eyeContactScore: 0,
        faceCentering: 0,
        faceSize: 0,
        lightingQuality: 0,
        portraitScore: 0,
      };
    }

    const faceCentering = faceIndicators.centerWeight;
    const faceSize = faceIndicators.faceSize;
    const lightingQuality = faceIndicators.lightingQuality;
    const eyeContactScore = faceIndicators.eyeRegionQuality;
    const portraitScore = (faceCentering + faceSize + lightingQuality + eyeContactScore) / 4;
    return {
      hasFace: true,
      eyeContactScore,
      faceCentering,
      faceSize,
      lightingQuality,
      portraitScore,
    };
  }

  calculateFaceIndicators(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    const centerRegion = this.analyzeRegion(data, width, height, 0.25, 0.25, 0.5, 0.5);
    const upperCenterRegion = this.analyzeRegion(data, width, height, 0.2, 0.15, 0.6, 0.4);
    const eyeRegion = this.analyzeRegion(data, width, height, 0.15, 0.2, 0.7, 0.3);

    let confidence = 0;

    if (centerRegion.avgBrightness > 80 && centerRegion.avgBrightness < 200) {
      confidence += 0.3;
    }

    if (centerRegion.contrast > 15) {
      confidence += 0.2;
    }

    const lowerCenterRegion = this.analyzeRegion(data, width, height, 0.25, 0.5, 0.5, 0.4);
    if (upperCenterRegion.avgBrightness > lowerCenterRegion.avgBrightness) {
      confidence += 0.2;
    }

    if (eyeRegion.darkPixelRatio > 0.1) {
      confidence += 0.3;
    }

    const centerWeight = Math.min(100, confidence * 100 + 50);
    const faceSize = Math.min(100, (centerRegion.pixelCount / (width * height)) * 400);
    const lightingQuality = Math.min(100, 100 - Math.abs(centerRegion.avgBrightness - 140) / 2);
    const eyeRegionQuality = Math.min(100, eyeRegion.contrast * 2 + 40);

    return {
      confidence,
      centerWeight,
      faceSize,
      lightingQuality,
      eyeRegionQuality,
    };
  }

  analyzeRegion(data, width, height, x, y, w, h) {
    const startX = Math.floor(x * width);
    const startY = Math.floor(y * height);
    const endX = Math.floor((x + w) * width);
    const endY = Math.floor((y + h) * height);

    let totalBrightness = 0;
    let brightnessValues = [];
    let darkPixels = 0;
    let pixelCount = 0;

    for (let py = startY; py < endY; py++) {
      for (let px = startX; px < endX; px++) {
        const idx = (py * width + px) * 4;
        const brightness = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

        totalBrightness += brightness;
        brightnessValues.push(brightness);
        if (brightness < 80) darkPixels++;
        pixelCount++;
      }
    }

    const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 0;

    let variance = 0;
    for (const brightness of brightnessValues) {
      variance += Math.pow(brightness - avgBrightness, 2);
    }
    const contrast = pixelCount > 0 ? Math.sqrt(variance / pixelCount) : 0;

    const darkPixelRatio = pixelCount > 0 ? darkPixels / pixelCount : 0;

    return {
      avgBrightness,
      contrast,
      darkPixelRatio,
      pixelCount,
    };
  }

  loadImageElement(imageFile) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let objectUrl = null;

      img.onload = () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        resolve(img);
      };

      img.onerror = (error) => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        reject(error);
      };

      try {
        objectUrl = URL.createObjectURL(imageFile.blob);
        img.src = objectUrl;
      } catch (error) {
        reject(error);
      }
    });
  }

  calculateFaceSize(box, imgWidth, imgHeight) {
    const faceArea = box.width * box.height;
    const imageArea = imgWidth * imgHeight;
    const faceRatio = faceArea / imageArea;

    if (faceRatio >= 0.15 && faceRatio <= 0.25) {
      return 100;
    } else if (faceRatio >= 0.10 && faceRatio <= 0.35) {
      return 80;
    } else if (faceRatio >= 0.05 && faceRatio <= 0.45) {
      return 60;
    } else {
      return 40;
    }
  }

  calculateFaceCentering(box, imgWidth, imgHeight) {
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;
    const imageCenterX = imgWidth / 2;
    const imageCenterY = imgHeight / 2;

    const distanceFromCenter = Math.sqrt(
      Math.pow(faceCenterX - imageCenterX, 2) + Math.pow(faceCenterY - imageCenterY, 2)
    );

    const maxDistance = Math.sqrt(Math.pow(imgWidth / 2, 2) + Math.pow(imgHeight / 2, 2));
    const centeringScore = Math.max(0, 100 - (distanceFromCenter / maxDistance) * 100);

    return centeringScore;
  }

  async calculateFaceLighting(img, box) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = box.width;
    canvas.height = box.height;

    ctx.drawImage(img, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
    const imageData = ctx.getImageData(0, 0, box.width, box.height);

    const data = imageData.data;
    let totalBrightness = 0;
    let brightnessValues = [];

    for (let i = 0; i < data.length; i += 4) {
      const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      totalBrightness += brightness;
      brightnessValues.push(brightness);
    }

    const avgBrightness = totalBrightness / brightnessValues.length;

    let variance = 0;
    for (const brightness of brightnessValues) {
      variance += Math.pow(brightness - avgBrightness, 2);
    }
    const stdDev = Math.sqrt(variance / brightnessValues.length);

    let lightingScore = 50;

    if (avgBrightness >= 80 && avgBrightness <= 160) {
      lightingScore += 30;
    } else if (avgBrightness >= 60 && avgBrightness <= 180) {
      lightingScore += 20;
    } else {
      lightingScore += 10;
    }

    if (stdDev >= 20 && stdDev <= 50) {
      lightingScore += 20;
    } else if (stdDev >= 15 && stdDev <= 60) {
      lightingScore += 15;
    } else {
      lightingScore += 5;
    }

    return Math.min(100, lightingScore);
  }

  calculateEyeContactScore(landmarks) {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    if (!leftEye || !rightEye || leftEye.length === 0 || rightEye.length === 0) {
      return 50;
    }

    let eyeContactScore = 0;

    const leftEyeOpenness = this.calculateEyeOpenness(leftEye);
    const rightEyeOpenness = this.calculateEyeOpenness(rightEye);
    const avgEyeOpenness = (leftEyeOpenness + rightEyeOpenness) / 2;

    if (avgEyeOpenness > 0.3) {
      eyeContactScore += 40;
    } else if (avgEyeOpenness > 0.2) {
      eyeContactScore += 25;
    } else if (avgEyeOpenness > 0.1) {
      eyeContactScore += 10;
    }

    const eyeSymmetry = 1 - Math.abs(leftEyeOpenness - rightEyeOpenness);
    eyeContactScore += eyeSymmetry * 30;

    const jawLine = landmarks.getJawOutline();
    if (jawLine && jawLine.length > 0) {
      const eyeAlignment = this.calculateEyeAlignment(leftEye, rightEye, jawLine);
      eyeContactScore += eyeAlignment * 20;
    } else {
      eyeContactScore += 15;
    }

    const gazeScore = this.approximateGazeDirection(leftEye, rightEye);
    eyeContactScore += gazeScore * 10;

    return Math.min(100, eyeContactScore);
  }

  calculateEyeOpenness(eyePoints) {
    if (eyePoints.length < 6) return 0;

    const p1 = eyePoints[0];
    const p2 = eyePoints[1];
    const p3 = eyePoints[2];
    const p4 = eyePoints[3];
    const p5 = eyePoints[4];
    const p6 = eyePoints[5];

    const d1 = Math.sqrt(Math.pow(p2.x - p6.x, 2) + Math.pow(p2.y - p6.y, 2));
    const d2 = Math.sqrt(Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2));
    const d3 = Math.sqrt(Math.pow(p1.x - p4.x, 2) + Math.pow(p1.y - p4.y, 2));

    if (d3 === 0) return 0;

    const ear = (d1 + d2) / (2 * d3);

    return Math.min(1, Math.max(0, ear / 0.3));
  }

calculateEyeAlignment(leftEye, rightEye, jawLine) {
  if (leftEye.length === 0 || rightEye.length === 0 || jawLine.length === 0) return 0.75;

  // Get eye centers
  const leftEyeCenter = this.getEyeCenter(leftEye);
  const rightEyeCenter = this.getEyeCenter(rightEye);

  // Calculate the angle between the eyes
  const eyeAngle = Math.atan2(
    rightEyeCenter.y - leftEyeCenter.y,
    rightEyeCenter.x - leftEyeCenter.x
  );

  // Good alignment is when eyes are roughly horizontal (angle close to 0)
  const angleDifference = Math.abs(eyeAngle);
  const alignmentScore = Math.max(0, 1 - (angleDifference / (Math.PI / 6))); // Penalize angles > 30 degrees

  return alignmentScore;
}
calculateOverallScore(technical, faces) {
  let score = 0;

  const baseWeights = {
    blur: 0.40,
    sharpness: 0.20,
    exposure: 0.02,
    contrast: 0.02,
    noise: 0.01,
    colorBalance: 0.0
  };

  const faceWeights = {
    eyeContact: 0.25,
    faceCentering: 0.05,
    faceSize: 0.02,
    lighting: 0.02,
    portraitScore: 0.01
  };

  const totalWeight =
    baseWeights.blur + baseWeights.sharpness + baseWeights.exposure +
    baseWeights.contrast + baseWeights.noise + baseWeights.colorBalance +
    faceWeights.eyeContact + faceWeights.faceCentering +
    faceWeights.faceSize + faceWeights.lighting + faceWeights.portraitScore;

  // Technical Scores
  score += ((100 - technical.blurScore) / 100) * baseWeights.blur;
  score += (technical.sharpnessScore / 100) * baseWeights.sharpness;
  score += (technical.exposureQuality / 100) * baseWeights.exposure;
  score += (technical.contrastScore / 100) * baseWeights.contrast;
  score += ((100 - technical.noiseLevel) / 100) * baseWeights.noise;
  score += (technical.colorBalance / 100) * baseWeights.colorBalance;

  // Face Quality
  if (faces && faces.faceCount > 0) {
    score += (faces.eyeContactScore / 100) * faceWeights.eyeContact;
    score += (faces.faceCentering / 100) * faceWeights.faceCentering;
    score += (faces.faceSize / 100) * faceWeights.faceSize;
    score += (faces.lightingQuality / 100) * faceWeights.lighting;
    score += (faces.portraitScore / 100) * faceWeights.portraitScore;
  }

  return Math.max(0, Math.min(100, (score / totalWeight) * 100));
}


getQualityTier(score) {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}



 calculateEyeAlignment(leftEye, rightEye, jawLine) {
  if (leftEye.length === 0 || rightEye.length === 0 || jawLine.length === 0) return 0.75;

  // Get eye centers
  const leftEyeCenter = this.getEyeCenter(leftEye);
  const rightEyeCenter = this.getEyeCenter(rightEye);

  // Calculate the angle between the eyes
  const eyeAngle = Math.atan2(
    rightEyeCenter.y - leftEyeCenter.y,
    rightEyeCenter.x - leftEyeCenter.x
  );

  // Good alignment is when eyes are roughly horizontal (angle close to 0)
  const angleDifference = Math.abs(eyeAngle);
  const alignmentScore = Math.max(0, 1 - (angleDifference / (Math.PI / 6))); 

  return alignmentScore;
}

 approximateGazeDirection(leftEye, rightEye) {
  if (leftEye.length < 6 || rightEye.length < 6) return 0.7;

  const leftEyeCenter = this.getEyeCenter(leftEye);
  const rightEyeCenter = this.getEyeCenter(rightEye);

  const leftGaze = this.estimateEyeGaze(leftEye, leftEyeCenter);
  const rightGaze = this.estimateEyeGaze(rightEye, rightEyeCenter);

  // Average gaze scores
  return (leftGaze + rightGaze) / 2;
}

 getEyeCenter(eyePoints) {
  const sumX = eyePoints.reduce((sum, point) => sum + point.x, 0);
  const sumY = eyePoints.reduce((sum, point) => sum + point.y, 0);

  return {
    x: sumX / eyePoints.length,
    y: sumY / eyePoints.length
  };
}

 estimateEyeGaze(eyePoints, eyeCenter) {
  if (eyePoints.length < 6) return 0.7;

  // Get leftmost and rightmost points of the eye
  const leftmostPoint = eyePoints[0];
  const rightmostPoint = eyePoints[3];

  // Calculate eye width
  const eyeWidth = rightmostPoint.x - leftmostPoint.x;

  if (eyeWidth <= 0) return 0.7;

  const expectedCenter = leftmostPoint.x + eyeWidth / 2;
  const actualCenter = eyeCenter.x;

  // Calculate deviation from center
  const deviation = Math.abs(actualCenter - expectedCenter) / (eyeWidth / 2);

  return Math.max(0, 1 - deviation);
}

 calculateBlurScore(imageData) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  let sum = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      // Get grayscale value
      const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

      // Simple edge detection
      const topIdx = ((y - 1) * width + x) * 4;
      const bottomIdx = ((y + 1) * width + x) * 4;
      const leftIdx = (y * width + (x - 1)) * 4;
      const rightIdx = (y * width + (x + 1)) * 4;

      const topGray = 0.299 * data[topIdx] + 0.587 * data[topIdx + 1] + 0.114 * data[topIdx + 2];
      const bottomGray = 0.299 * data[bottomIdx] + 0.587 * data[bottomIdx + 1] + 0.114 * data[bottomIdx + 2];
      const leftGray = 0.299 * data[leftIdx] + 0.587 * data[leftIdx + 1] + 0.114 * data[leftIdx + 2];
      const rightGray = 0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2];

      const laplacian = Math.abs(4 * gray - topGray - bottomGray - leftGray - rightGray);
      sum += laplacian * laplacian;
      count++;
    }
  }

  const variance = count > 0 ? sum / count : 0;
  return Math.min(100, variance / 10); // Normalize to 0-100
}

 calculateExposureQuality(imageData) {
  const data = imageData.data;
  const histogram = new Array(256).fill(0);

  // Build histogram
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    histogram[gray]++;
  }

  const totalPixels = data.length / 4;

  // Check for proper distribution (not too many dark or bright pixels)
  const darkPixels = histogram.slice(0, 50).reduce((sum, count) => sum + count, 0);
  const brightPixels = histogram.slice(200, 256).reduce((sum, count) => sum + count, 0);

  const darkRatio = darkPixels / totalPixels;
  const brightRatio = brightPixels / totalPixels;

  // Good exposure has balanced distribution
  let score = 100;
  if (darkRatio > 0.3) score -= (darkRatio - 0.3) * 200;
  if (brightRatio > 0.3) score -= (brightRatio - 0.3) * 200;

  return Math.max(0, Math.min(100, score));
}

 calculateContrastScore(imageData) {
  const data = imageData.data;
  let sum = 0;
  let sumSquares = 0;
  const totalPixels = data.length / 4;

  // Calculate mean and standard deviation
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += gray;
    sumSquares += gray * gray;
  }

  const mean = sum / totalPixels;
  const variance = (sumSquares / totalPixels) - (mean * mean);
  const stdDev = Math.sqrt(variance);

  // Higher standard deviation indicates better contrast
  return Math.min(100, (stdDev / 64) * 100);
}

 calculateNoiseLevel(imageData) {
  // Simplified noise calculation
  const data = imageData.data;
  let noiseSum = 0;
  let count = 0;

  for (let i = 4; i < data.length - 4; i += 4) {
    const current = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const prev = 0.299 * data[i - 4] + 0.587 * data[i - 3] + 0.114 * data[i - 2];

    noiseSum += Math.abs(current - prev);
    count++;
  }

  const avgNoise = count > 0 ? noiseSum / count : 0;
  return Math.max(0, 100 - (avgNoise / 10)); // Lower noise = higher score
}

 calculateSharpnessScore(imageData) {
  // Use similar calculation to blur but return as sharpness
  const blurScore = this.calculateBlurScore(imageData);
  return blurScore; // Higher blur variance = higher sharpness
}

calculateColorBalance(imageData) {
  const data = imageData.data;
  let rSum = 0, gSum = 0, bSum = 0;
  const totalPixels = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    rSum += data[i];
    gSum += data[i + 1];
    bSum += data[i + 2];
  }

  const rAvg = rSum / totalPixels;
  const gAvg = gSum / totalPixels;
  const bAvg = bSum / totalPixels;

  // Calculate how balanced the color channels are
  const maxChannel = Math.max(rAvg, gAvg, bAvg);
  const minChannel = Math.min(rAvg, gAvg, bAvg);

  if (maxChannel === 0) return 100;

  const balance = minChannel / maxChannel;
  return balance * 100;
}
calculateSimilarityFromHashes(fingerprint1, fingerprint2, similarityThreshold = 0.85) {
        try {
            const comparison = this.imageMatcher.compareImages(fingerprint1, fingerprint2);
            const isSimilar = comparison.overall >= similarityThreshold;
            if (isSimilar) {
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

    
  calculateSimilarity(hash1, hash2) {
    if (hash1.length !== hash2.length) return 0;

    let hammingDistance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        hammingDistance++;
      }
    }
    

  const similarity = (hash1.length - hammingDistance) / hash1.length; 
    return (hash1.length - hammingDistance) / hash1.length;
  }

    groupSimilarImages(comparisons) {
        const connections = {};
        const imageIdToIndex = {};
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
                }
            }
        }
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
            quality_array: session.allResults || [],
            total_comparisons: session.total_comparisons || 0,
            similar_pairs_found: session.similar_pairs_found || 0,
            last_analysis: session.last_analysis,
            created_at: session.created_at
        };
    }

    async base64ToBlob(base64Data, mimeType) {
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
            console.groupEnd();
            this.createCanvasPreview(imageId, dataUrl);

        } catch (e) {
        }
    }

    createCanvasPreview(imageId, dataUrl) {
        try {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                const maxSize = 150;
                const ratio = Math.min(maxSize / img.width, maxSize / img.height);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const canvasDataUrl = canvas.toDataURL();
            };
            img.src = dataUrl;
        } catch (e) {
        }
    }
}

class PhotoExtractor {
    constructor() {
        this.isPaused = false;   
        this.resumeFromPause = false;
        this.frontendSessionManager = new FrontendSessionManager();
        this.photos = [];
        this.isProcessing = false;
        this.scrollAttempts = 0;
        this.maxScrollAttempts = 10;
        this.scrollDelay = 300; 
        this.isInitialized = false;
        this.isScanning = false;
        this.isFullWorkflow = false; 
        this.scanComplete = false; 
        this.panelOpen = false;
        this.observer = null;
        this.lastScreenshotTime = 0; 
        this.faceApiLoaded = false;
        this.modelsLoaded = false; 
        this.groupsAlreadyCounted = false; 
        this.imageSizeCache = {};
        this.authDataCache = null; 
        this.viewportObserver = null;
        this.viewportTimers = new Map(); 
        this.imageSizeLoaders = new Map(); 
        this.photoScrollPositions = new Map(); 
        this.metadataSelectionInProgress = false; 

        this.init();
    }
    async init() {
        // await this.loadPaidStatus();
        this.initializeFaceDetection();
        this.initializeFullPanel();
    }
    refreshPanel() {
        // Remove existing panel and recreate it
        const existingPanel = $('#photo-cleaner-panel');
        if (existingPanel.length) {
            existingPanel.remove();
        }
        this.initializeFullPanel();
    }
    async openExtensionPage() {

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'openExtensionPage'
            });

            if (response && response.success) {
            } else {
                alert('Failed to open extension page. Please manually open the extension from your browser toolbar to purchase.');
            }
        } catch (error) {
            alert('Failed to open extension page. Please manually open the extension from your browser toolbar to purchase.');
        }
    }
    async initializeFaceDetection() {
        try {
            if (typeof faceapi === 'undefined') {
                await this.waitForFaceApi();
            }

            const modelPath = chrome.runtime.getURL('models');
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
                faceapi.nets.faceExpressionNet.loadFromUri(modelPath)
            ]);

            this.modelsLoaded = true;
        } catch (error) {
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

    initializeFullPanel() {
         if ($('#photo-cleaner-panel').length) {
            return;
        }

        const triggerButton =$('#photo-cleaner-trigger');
        if (triggerButton.length) {
            triggerButton.remove();
        }

        const viewportCheck = this.checkViewportSize();
        if (!viewportCheck.adequate) {
            this.showViewportResizeMessage(viewportCheck);
            return;
        }
        const newMagnifierIconUrl = chrome.runtime.getURL('../icons/magnifier.svg');
        const statusElement = $('<div>', { id: 'pc-floating-status',class:"pc-floating-Main",style: 'display:none;' }).html(`
        <div id="pc-floating-status" class=" g-btn absolute left-[20px] top-[20px] left-[50%] -translate-x-[50%] !w-[97%] bg-gradient p-4 rounded-[20px]">
        <span id="pc-photo-count">Idle</span>
         <span id="pc-progress-text" style="display:none;">Preparing to analyze 0/0</span>
        </div>
        `);
        statusElement.find('.new-Magnifier').attr('src', newMagnifierIconUrl);
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


            const versionHtml = `
                    <div class="flex items-center justify-between gap-4">
                    <a href="#" class="flex items-center gap-1 text-white font-semibold">
                        <span class="w-[30px] pl-2 premium-icon ">
                        <img alt="">
                        </span> 
                    </a>
                    <a href="#" id="pc-close" class="font-semibold w-[30px] h-[30px] !rounded-full !bg-white flex justify-center items-center">
                        <i class="fa-solid fa-xmark text-white"></i>
                    </a>
                    
                    </div>
                `;

            panel.find('#pc-version-wrap').html(versionHtml);
            panel.find('.play-img').attr('src', playIconUrl);
            panel.find('.paush-img').attr('src', paushIconUrl);

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

    $('#pc-close').on('click', () => {
            this.closePanel();
            $('body').removeClass('pc-overlay-active');
        });

  $(document)
  .off('click', '#pc-scan') 
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
        this.isInitialized = true;
        const urlParams = new URLSearchParams(window.location.search);
        const shouldAutoStart = urlParams.has('pc_scan_start');

        if (shouldAutoStart) {
            const isFullWorkflow = urlParams.has('pc_full_workflow');
            const similarityThreshold = urlParams.get('pc_similarity') || 85;

           const similarityInput  = $('#pc-similarity'); 
        if (similarityInput .length) {
            similarityInput .text(similarityThreshold);
        } else {
        }

            if (isFullWorkflow) {
                setTimeout(() => {
                    this.startFullWorkflow();
                }, 1000);
            } else {
                // This is after a page reload for scanning only - start scanning
                setTimeout(() => {
                    this.startScanning();
                }, 1000);
            }
        } else {
        }

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

    closePanel() {
        const panel = $('#photo-cleaner-panel');
        if (panel.length) {
            panel.remove();
        }

        const statusElement =  $('#pc-floating-status');
        if (statusElement.length) {
            statusElement.remove();
        }
        this.showWindowWarning(false);
        this.disconnectObserver();

        this.photos = [];
        this.isProcessing = false;
        this.isInitialized = false;
        this.scanComplete = false;
    }

  closeInitialPopup() {
          const PopUp = $('.popup-wrapper');
        if (PopUp.length) {
            PopUp.remove();
        }
    }
     
    setupObserver() {
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new MutationObserver((mutations) => {
            if (!this.isInitialized || !this.isScanning) return;

            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
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
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = null;
        }
    }

    async startScanning() {
        if (this.isProcessing && !this.resumeFromPause) return;
        const urlParams = new URLSearchParams(window.location.search);
        const isAutoRestart = urlParams.has('pc_scan_start');

        if (!this.resumeFromPause) {
        if (!isAutoRestart) {
            const scanBtn = $('#pc-scan');
            const photoCountElement = $('#pc-photo-count');

            if (scanBtn.length) {
               scanBtn.find('.btn-label').text('🔄 Opening new window...');
            }
            if (photoCountElement.length) {
                photoCountElement.html('Opening new window for clean scan...');
            }

            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('pc_scan_start', '1');

            if (this.isFullWorkflow) {
                currentUrl.searchParams.set('pc_full_workflow', '1');
                currentUrl.searchParams.set('pc_similarity', this.similarityThreshold || 85);
            }

            const screenWidth = window.screen.availWidth;
            const screenHeight = window.screen.availHeight;
            const newWindow = window.open(
                currentUrl.toString(),
                '_blank',
                `width=${screenWidth},height=${screenHeight},left=0,top=0,scrollbars=yes,resizable=yes,toolbar=yes,menubar=yes,location=yes`
            );

            if (newWindow) {

                setTimeout(() => {
                    if (scanBtn.length) {
                        scanBtn.text('🔍 Scan for Duplicates').prop('disabled', false);
                    }
                    if (photoCountElement.length) {
                    }
                }, 1000);
                
            } else {
                console.error('❌ Failed to open new window (popup blocked?)');
                alert('Failed to open new window. Please allow popups for this site and try again.');

                if (scanBtn.length) {
                    scanBtn.text('🔍 Scan for Duplicates').prop('disabled', false);
                }
                if (photoCountElement.length) {
                    photoCountElement.html('Failed to open new window');
                }
            }

            return 'NEW_WINDOW_OPENED'; 
        }

        }
        this.isProcessing = true;
        this.isScanning = true;
        this.resumeFromPause = false;

        this.isProcessing = true;
        this.isScanning = true; 
        this.showWindowWarning(true); 
        this.scanComplete = false; 
        this.scrollAttempts = 0;

        this.clearPreviousResults();

        this.initialPhotoCount = this.photos.length;

        this.setupObserver();

        const scanBtn = $('#pc-scan');

       this.togglePlayPauseUI(true); // Play→Pause icon switch

       scanBtn.find('.btn-label').text('⏳ Scanning...');

        await this.scanWithScroll();

        this.disconnectObserver();

        if (!this.isFullWorkflow) {
            scanBtn.find('.btn-label').text('🔍 Scan for Duplicates').parent().prop('disabled', false);
            this.isProcessing = false;
            this.isScanning = false; 
            this.showWindowWarning(false); 
        } else {
            this.isScanning = false;
            this.showWindowWarning(false); 
        }

    }
    clearPreviousResults() {
        this.photos = [];
        this.videos = [];
        this.videosFound = 0;

        this.scanComplete = false;

        this.photoScrollPositions.clear();

        const existingOverlay = $('#pc-results-overlay');
        if (existingOverlay.length) {
            existingOverlay.remove();
        }

        chrome.storage.local.remove(['analysisResults', 'photos', 'timestamp']);

        if (!this.isScanning) {
            this.updatePhotoCount();
        }

        if (!this.isScanning) {
            this.showProgress(false);
        }

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
    }

    async scanWithScroll() {
        await this.delay(2000);

        const scrollInfo = this.initializeScrollTracking();
        let totalScrolls = 0;
        let consecutiveCyclesWithoutProgress = 0;
        const MAX_CYCLES_WITHOUT_PROGRESS = 3;

        while (true) {
        if (this.isPaused) {
        await new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (!this.isPaused) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100); 
        });
        }
            totalScrolls++;

            const beforeCount = this.photos.length;
            this.extractPhotos();
            const afterExtraction = this.photos.length;
            const newPhotosThisCycle = afterExtraction - beforeCount;

            const needsBacktrack = await this.checkAndHandleIncompleteBackgrounds();
            if (needsBacktrack) {
                this.extractPhotos(); 
            }

            const scrollResult = await this.performScroll();
            const scrolled = scrollResult && (scrollResult === true || scrollResult.scrolled === true);
            const scrollDelta = scrollResult && typeof scrollResult === 'object' ? scrollResult.scrollDelta : undefined;

            if (scrollDelta !== undefined) {
            }

            if (newPhotosThisCycle === 0) {
                consecutiveCyclesWithoutProgress++;
                if (consecutiveCyclesWithoutProgress >= MAX_CYCLES_WITHOUT_PROGRESS) {
                    if (scrollDelta !== undefined && scrollDelta < 2) { 
                        break;
                    }
                    await this.delay(3000);
                    const retryScrollResult = await this.performScroll();
                    const retryScrolled = retryScrollResult && (retryScrollResult === true || retryScrollResult.scrolled === true);
                    if (!retryScrolled) {
                        break;
                    } else {
                        consecutiveCyclesWithoutProgress = 0; 
                    }
                }
            } else {
                consecutiveCyclesWithoutProgress = 0;
            }

            if (!scrolled) {
                await this.delay(3000);

                const retryScrollResult = await this.performScroll();
                const retryScrolled = retryScrollResult && (retryScrollResult === true || retryScrollResult.scrolled === true);
                if (!retryScrolled) {
                    break;
                } else {
                    await this.waitForPhotosToLoad();
                }
            } else {
                await this.waitForPhotosToLoad();
            }

            this.updateScanProgress(scrollInfo);
        }

        const scanBtn = $('#pc-scan')
        const countElement = document.getElementById('pc-photo-count');

        if (scanBtn) {
            scanBtn.textContent = 'Cleaning up...';
        }

        if (countElement) {
            countElement.innerHTML = 'Performing final cleanup...';
            countElement.style.color = '#FF9800';
            countElement.style.fontStyle = 'italic';
        }

        await this.performFinalCleanup();

        if (scanBtn) {
            scanBtn.textContent = 'Scan for Photos';
        }
    }



    async performFinalCleanup() {
        const beforeCleanup = this.photos.length;

        this.updateCleanupProgress('Finding missed photos...');
        await this.delay(2000);
        this.extractPhotos(true);

        const afterExtraction = this.photos.length;
        const newPhotosFound = afterExtraction - beforeCleanup;

        if (newPhotosFound > 0) {
        }
        this.updateCleanupProgress('🔄 Removing duplicates...');

        const beforeDedup = this.photos.length;
        this.removeDuplicatePhotos();
        const afterDedup = this.photos.length;
        const duplicatesRemoved = beforeDedup - afterDedup;

        if (duplicatesRemoved > 0) {
        }
        this.updateCleanupProgress('🧽 Removing duplicates...');

        const beforeFinalDedup = this.photos.length;
        this.removeDuplicatePhotos();
        const afterFinalDedup = this.photos.length;
        const finalDuplicatesRemoved = beforeFinalDedup - afterFinalDedup;

        if (finalDuplicatesRemoved > 0) {
        }

        this.scanComplete = true; 
        this.restorePhotoCountDisplay();
        
        const totalChanges = newPhotosFound + duplicatesRemoved + finalDuplicatesRemoved;
        if (totalChanges > 0) {
        }
    }

    removeDuplicatePhotos() {
        const seen = new Set();
        const uniquePhotos = [];

        for (const photo of this.photos) {
            const uniqueKey = this.generateUniqueKey(photo);

            if (!seen.has(uniqueKey)) {
                seen.add(uniqueKey);
                uniquePhotos.push(photo);
            } else {
            }
        }

        this.photos = uniquePhotos;
    }

    generateUniqueKey(photo) {
        const components = [];
        if (photo.id && !photo.id.startsWith('photo_')) {
            components.push(`id:${photo.id}`);
        }
        if (photo.url) {
            const normalizedUrl = this.normalizeImageUrl(photo.url);
            components.push(`url:${normalizedUrl}`);
        }
        if (photo.href) {
            const hrefMatch = photo.href.match(/photo\/([^\/\?]+)/);
            if (hrefMatch) {
                components.push(`href:${hrefMatch[1]}`);
            }
        }
        if (photo.ariaLabel && photo.ariaLabel !== 'Unknown') {
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
            const paramsToRemove = ['w', 'h', 's', 'c', 'rw', 'rh', 'rs', 'k', 'mo'];
            paramsToRemove.forEach(param => {
                urlObj.searchParams.delete(param);
            });
            let pathname = urlObj.pathname;
            pathname = pathname.replace(/=w\d+-h\d+(-[a-z]+)?$/, '');
            pathname = pathname.replace(/=s\d+(-[a-z]+)?$/, '');

            return urlObj.origin + pathname + urlObj.search;
        } catch (e) {
            return url;
        }
    }



    initializeScrollTracking() {
        const scrollableContainer = this.findScrollableContainer();

        if (scrollableContainer) {
            return {
                container: scrollableContainer,
                type: 'container',
                totalScrollable: Math.max(0, scrollableContainer.scrollHeight - scrollableContainer.clientHeight),
                initialScroll: scrollableContainer.scrollTop
            };
        } else {
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
            scrollPercentage = Math.min(100, Math.round((this.scrollAttempts / this.maxScrollAttempts) * 100));
        }
        const countElement = document.getElementById('pc-photo-count');
        if (countElement) {
            if (this.photos.length === 0 && this.videos.length === 0) {
                countElement.innerHTML = 'Scanning';
            } else {
            }
            countElement.className = '';
            countElement.style.color = '';
            countElement.style.fontStyle = '';
        }
    }

    async performScroll() {
        const scrollableContainer = this.findScrollableContainer();

        if (scrollableContainer) {
            return await this.scrollContainer(scrollableContainer);
        } else {
            return await this.scrollDocument();
        }
    }

    findScrollableContainer() {
        const photoContainer = this.findScrollableContainerFromPhoto();
        if (photoContainer) {
            return photoContainer;
        }
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
                if (this.isScrollable(element)) {
                    return element;
                }
            }
        }

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
            return bestCandidate;
        }

        return null;
    }

    findScrollableContainerFromPhoto() {
        const photoSelectors = [
            '*[style*="background-image"]',
            '*[data-latest-bg]',
            'img[src*="googleusercontent"]',
            'img[src*="ggpht.com"]'
        ];

        let firstPhotoElement = null;

        for (const selector of photoSelectors) {
            const elements = document.querySelectorAll(selector);

            for (const element of elements) {
                if (selector.includes('background-image') || selector.includes('data-latest-bg')) {
                    const linkElement = element.closest('a[href*="/photo/"]');
                    if (linkElement) {
                        const ariaLabel = linkElement.getAttribute('aria-label');
                        if (ariaLabel && ariaLabel.includes('Photo')) {
                            firstPhotoElement = element;
                            break;
                        }
                    }
                } else {
                    firstPhotoElement = element;
                    break;
                }
            }

            if (firstPhotoElement) break;
        }

        if (!firstPhotoElement) {
            return null;
        }

        let currentElement = firstPhotoElement;
        let traversalDepth = 0;
        const maxTraversalDepth = 20; 

        while (currentElement && currentElement !== document.body && traversalDepth < maxTraversalDepth) {
            traversalDepth++;
            currentElement = currentElement.parentElement;

            if (currentElement) {
                if (this.isScrollable(currentElement)) {
                    return currentElement;
                }
            }
        }
        return null;
    }

    isScrollable(element) {
        if (!element || element === document.body || element === document.documentElement) {
            return false;
        }

        const style = window.getComputedStyle(element);
        const hasExplicitOverflow = style.overflow === 'auto' || style.overflow === 'scroll' ||
            style.overflowY === 'auto' || style.overflowY === 'scroll';
        const hasScrollableContent = element.scrollHeight > element.clientHeight + 5; 
        const hasHiddenOverflow = style.overflow === 'hidden' || style.overflowY === 'hidden';
        const hasSignificantHeight = element.scrollHeight > element.clientHeight + 100;

        const isScrollable = (hasExplicitOverflow && hasScrollableContent) ||
            (hasHiddenOverflow && hasSignificantHeight);

        if (isScrollable) {
        }

        return isScrollable;
    }

    async scrollContainer(container) {
        const startScrollTop = container.scrollTop;
        const scrollStep = Math.min(container.clientHeight * 0.5, 400); 
        const photosBeforeScroll = this.photos.length;
        const maxScrollTop = container.scrollHeight - container.clientHeight;
        const isAtBottom = startScrollTop >= (maxScrollTop - 10); 

        if (isAtBottom) {
            return false;
        }

        let scrolled = false;
        let newScrollTop = startScrollTop;

        const targetScroll = Math.min(startScrollTop + scrollStep, maxScrollTop);
        container.scrollTop = targetScroll;

        await this.delay(50);
        newScrollTop = container.scrollTop;
        scrolled = newScrollTop > startScrollTop; 

        if (!scrolled) {
            container.scrollBy({
                top: scrollStep,
                behavior: 'auto'
            });

            await this.delay(50);
            newScrollTop = container.scrollTop;
            scrolled = newScrollTop > startScrollTop; 
        }
        if (!scrolled) {
            const childElements = container.querySelectorAll('*');
            if (childElements.length > 10) {
                const targetElement = childElements[Math.floor(childElements.length * 0.7)]; 
                try {
                    targetElement.scrollIntoView({ behavior: 'auto', block: 'start' });
                    await this.delay(50);
                    newScrollTop = container.scrollTop;
                    scrolled = newScrollTop > startScrollTop; 
                } catch (error) {
                }
            }
        }
        const photosLoaded = await this.waitForPhotosToLoad();

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

        return scrollResult;
    }

    async scrollDocument() {
        const startScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        const scrollStep = window.innerHeight * 0.5; 
        const maxScroll = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;
        const isAtBottom = startScrollY >= (maxScroll - 10);

        if (isAtBottom) {
            return false;
        }

        const photosBeforeScroll = this.photos.length;
        window.scrollBy({
            top: scrollStep,
            left: 0,
            behavior: 'auto'
        });

        await this.delay(50);

        const photosLoaded = await this.waitForPhotosToLoad();
        const newScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        const scrolled = newScrollY > startScrollY;
        const photosAfterScroll = this.photos.length;
        const newPhotosFound = photosAfterScroll - photosBeforeScroll;
        if (!scrolled) {
            const targetScroll = startScrollY + scrollStep;
            const maxScroll = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;
            const scrollTo = Math.min(targetScroll, maxScroll);

            window.scrollTo({
                top: scrollTo,
                left: 0,
                behavior: 'auto'
            });

            await this.delay(50);
            await this.waitForPhotosToLoad();

            const finalScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
            const finalScrolled = finalScrollY > startScrollY; 
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
        const startTime = Date.now();
        let lastPhotoCount = this.photos.length;
        let lastBackgroundLoadedCount = 0;
        let stableChecks = 0;
        let backgroundStableChecks = 0;
        const maxStableChecks = 4; 
        const maxBackgroundStableChecks = 3; 
        const checkInterval = 500; 

        while (Date.now() - startTime < maxWaitTime) {
            await this.delay(checkInterval);

            this.extractPhotos(false, true); 
            const currentPhotoCount = this.photos.length;
            const newPhotosFound = currentPhotoCount - lastPhotoCount;

            if (newPhotosFound > 0) {
                lastPhotoCount = currentPhotoCount;
                stableChecks = 0; 
                backgroundStableChecks = 0; 
            } else {
                stableChecks++;
            }

            const photosWithBackgrounds = await this.checkPhotosHaveBackgrounds();
            const backgroundLoadRatio = photosWithBackgrounds.checked > 0 ?
                photosWithBackgrounds.loaded / photosWithBackgrounds.checked : 1;

            if (photosWithBackgrounds.loaded === lastBackgroundLoadedCount) {
                backgroundStableChecks++;
            } else {
                backgroundStableChecks = 0;
                lastBackgroundLoadedCount = photosWithBackgrounds.loaded;
            }

            if (stableChecks >= maxStableChecks && backgroundLoadRatio >= 0.75) {
                break;
            }

            if (stableChecks <= 1 && backgroundLoadRatio >= 0.9) {
                break;
            }

            if (Date.now() - startTime >= 1500 &&
                stableChecks >= 2 &&
                backgroundLoadRatio >= 0.7) {
                break;
            }
            if (stableChecks >= maxStableChecks + 2 &&
                backgroundStableChecks >= maxBackgroundStableChecks + 1 &&
                backgroundLoadRatio >= 0.6) {
                break;
            }
        }

        const totalWaitTime = Date.now() - startTime;
        const totalNewPhotos = this.photos.length - lastPhotoCount;

        if (totalWaitTime >= maxWaitTime) {
        }
        return this.photos.length;
    }

    async checkAndHandleIncompleteBackgrounds() {
        const photosWithBackgrounds = await this.checkPhotosHaveBackgrounds();
        const backgroundLoadRatio = photosWithBackgrounds.checked > 0 ?
            photosWithBackgrounds.loaded / photosWithBackgrounds.checked : 1;

        if (backgroundLoadRatio < 0.8 && photosWithBackgrounds.checked > 0) {
            const currentScrollContainer = this.findScrollableContainer();
            const currentScrollPosition = currentScrollContainer ?
            currentScrollContainer.scrollTop : window.pageYOffset;
            const backtrackAmount = currentScrollContainer ?
                Math.min(currentScrollContainer.clientHeight * 1.5, 800) :
                Math.min(window.innerHeight * 1.5, 800);

            if (currentScrollContainer) {
                const targetPosition = Math.max(0, currentScrollPosition - backtrackAmount);
                currentScrollContainer.scrollTop = targetPosition;
            } else {
                const targetPosition = Math.max(0, currentScrollPosition - backtrackAmount);
                window.scrollTo(0, targetPosition);
            }
            await this.waitForPhotosToLoad(8000); 
            const afterBacktrackStatus = await this.checkPhotosHaveBackgrounds();
            const afterBacktrackRatio = afterBacktrackStatus.checked > 0 ?
                afterBacktrackStatus.loaded / afterBacktrackStatus.checked : 1;
            if (currentScrollContainer) {
                currentScrollContainer.scrollTop = currentScrollPosition;
            } else {
                window.scrollTo(0, currentScrollPosition);
            }
            await this.delay(500);

            return true; 
        } else {
            return false; 
        }
    }

    async checkPhotosHaveBackgrounds() {
        let photosWithBackgrounds = 0;
        const photosToCheck = Math.min(this.photos.length, 30); 
        const startIndex = Math.max(0, this.photos.length - photosToCheck);
        const photosToCheckArray = this.photos.slice(startIndex);

        for (let i = 0; i < photosToCheckArray.length; i++) {
            const photo = photosToCheckArray[i];
            if (photo.element) {
                const hasBackground = this.elementHasLoadedBackground(photo.element);
                if (hasBackground) {
                    photosWithBackgrounds++;
                } else {
                    if (i < 2) {
                        const bgElements = photo.element.querySelectorAll('*[style*="background-image"], *[data-latest-bg]');
                        bgElements.forEach((el, idx) => {
                            if (idx < 1) {
                            }
                        });
                    }
                }
            }
        }
        return {
            loaded: photosWithBackgrounds,
            checked: photosToCheckArray.length,
            total: this.photos.length
        };
    }

    elementHasLoadedBackground(element) {
        const bgElements = element.querySelectorAll('*[style*="background-image"], *[data-latest-bg]');

        for (const bgElement of bgElements) {
            const style = bgElement.getAttribute('style');
            const dataLatestBg = bgElement.getAttribute('data-latest-bg');
            if (dataLatestBg && dataLatestBg.trim() !== '') {
                return true;
            }
            if (style) {
                const patterns = [
                    /background-image:\s*url\(&quot;([^&"]+)&quot;\)/,  
                    /background-image:\s*url\("([^"]+)"\)/,          
                    /background-image:\s*url\('([^']+)'\)/,          
                    /background-image:\s*url\(([^)]+)\)/          
                ];

                for (const pattern of patterns) {
                    const urlMatch = style.match(pattern);
                    if (urlMatch && urlMatch[1] && urlMatch[1].trim() !== '') {
                        const imageUrl = urlMatch[1].trim();
                        if (imageUrl !== 'none' && imageUrl.length > 10) {
                            if (imageUrl.includes('googleusercontent.com') ||
                                imageUrl.includes('ggpht.com') ||
                                imageUrl.includes('photos.google.com')) {
                                const rect = bgElement.getBoundingClientRect();
                                if (rect.width > 0 && rect.height > 0) {
                                    return true;
                                }
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
        }
        let allElements;

        if (thorough) {
            allElements = document.querySelectorAll([
                '*[style*="background-image"]',
                '*[data-latest-bg]',
                '*[style*="background"]',  
                'img[src*="googleusercontent"]',  
                'img[src*="photos.google"]'
            ].join(', '));
        } else {
            allElements = document.querySelectorAll('*[style*="background-image"], *[data-latest-bg]');
            const bgImageElements = document.querySelectorAll('*[style*="background-image"]');
            const dataLatestBgElements = document.querySelectorAll('*[data-latest-bg]');
        }
        for (let index = 0; index < allElements.length; index++) {
            const element = allElements[index];
            let linkElement, imageUrl, ariaLabel;
            if (element.tagName === 'IMG') {
                linkElement = element.closest('a[href*="/photo/"]');
                imageUrl = element.src;
                ariaLabel = element.alt || element.getAttribute('aria-label');
            } else {
                linkElement = element.closest('a[href*="/photo/"]');
                if (!linkElement) continue;

                ariaLabel = linkElement.getAttribute('aria-label');

                const style = element.getAttribute('style');
                const dataLatestBg = element.getAttribute('data-latest-bg');
                if (dataLatestBg) {
                    imageUrl = dataLatestBg;
                } else if (style) {
                    let urlMatch = null;
                    const patterns = [
                        /background-image:\s*url\(&quot;([^&"]+)&quot;\)/,  
                        /background-image:\s*url\("([^"]+)"\)/,           
                        /background-image:\s*url\('([^']+)'\)/,           
                        /background-image:\s*url\(([^)]+)\)/          
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
            if (element.tagName !== 'IMG' && !linkElement) continue;
            let isVideo = false;
            if (linkElement) {
                const parentElement = linkElement.parentElement;
                isVideo = parentElement && (
                    parentElement.classList.contains('e37Orb') ||
                    parentElement.querySelector('.KhS5De') ||
                    parentElement.querySelector('[jscontroller="qUYJve"]') ||
                    parentElement.querySelector('svg path[d*="M10 16.5l6-4.5-6-4.5z"]')
                );
            }
            if (imageUrl) {
                if (isVideo) {
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
                        this.photoScrollPositions.set(videoId, currentScrollPosition);

                        if (!silent) {
                        }
                    }
                    continue; 
                }
            }
            if (imageUrl) {
                const existingPhoto = this.photos.find(p =>
                    p.url === imageUrl ||
                    (linkElement && p.element === linkElement)
                );

                if (!existingPhoto) {
                    const photoId = this.generatePhotoId(linkElement || element, index);
                    const currentScrollPosition = this.getCurrentScrollPosition();

                    if (!silent) {
                        if (thorough) {
                        } else {
                        }
                    }

                    this.photos.push({
                        id: photoId,
                        url: imageUrl,
                        element: linkElement || element,
                        ariaLabel: ariaLabel || 'Unknown',
                        href: linkElement ? linkElement.getAttribute('href') || '' : '',
                        processed: false,
                        scrollPosition: currentScrollPosition 
                    });
                    this.photoScrollPositions.set(photoId, currentScrollPosition);


                }
            }
        }

        const afterCount = this.photos.length;
        const newPhotosFound = afterCount - beforeCount;
        if (!this.isScanning && !silent) {
            this.updatePhotoCount();
        }
    }

    generatePhotoId(element, index) {
        const href = element.getAttribute('href') || '';
        const match = href.match(/photo\/([^\/]+)/);
        return match ? match[1] : `photo_${index}_${Date.now()}`;
    }
    getCurrentScrollPosition() {
        const scrollContainer = this.findScrollableContainer();
        if (scrollContainer) {
            return scrollContainer.scrollTop;
        } else {
            return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        }
    }

    updatePhotoCount() {
        if (this.scanComplete) {
            return;
        }
        if (this.isScanning) {
            return;
        }

        const countElement = document.getElementById('pc-photo-count');
        if (countElement) {
            if (this.photos.length === 0 && this.videos.length === 0 && !this.isProcessing) {
                countElement.innerHTML = 'Idle';
            } else {
            }

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

    async analyzePhotos() {
        if (this.photos.length < 2 && this.videos.length < 2) {
            alert('Need at least 2 photos or videos to analyze');
            return;
        }

        this.groupsAlreadyCounted = false;

        this.showProgress(true);
        this.updateProgress(0, 'Creating frontend analysis session...');

        try {
            const sessionId = this.frontendSessionManager.createSession();

            this.updateProgress(5, 'Processing photos and videos with frontend hash computation...');
            await this.uploadPhotosToFrontendSession(sessionId);

            this.updateProgress(85, 'Running frontend similarity analysis...');
            this.frontendSessionManager.progressCallback = (percent, message) => {
                const mappedPercent = 85 + (percent - 10) * 0.1; 
                this.updateProgress(mappedPercent, message);
            };
            const similarityThreshold = this.similarityThreshold || $('#pc-similarity').val() || 75;
            const results = await this.frontendSessionManager.analyzeSession(sessionId, parseInt(similarityThreshold));
            this.frontendSessionManager.progressCallback = null;
            const transformedResults = this.transformFrontendResults(results, sessionId);
            this.processedPhotosCount = transformedResults.total_images || this.photos.length;

            await this.delay(500);
            this.showProgress(false);

              $('body').removeClass('pc-overlay-active');
            this.showResults(transformedResults);

        } catch (error) {
            console.error('Error analyzing photos with frontend:', error);
            this.showProgress(false);
        }
    }

    async uploadPhotosToFrontendSession(sessionId) {

        const layout = this.calculateOptimalBatchLayout();
        const batchSize = layout.batchSize;

        let uploaded = 0;
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

                if (i + batchSize < this.photos.length) {
                    await this.delay(400);
                }
            } catch (error) {
                console.error(`❌ Frontend batch ${Math.floor(i / batchSize) + 1} failed:`, error);
            }
        }

        this.hideScreenshotArea();
        return uploaded;
    }
    transformFrontendResults(frontendResults, sessionId) {
        const session = this.frontendSessionManager.getSessionStatus(sessionId);

        return {
            success: true,
            session_id: sessionId,
            total_images: frontendResults.total_images,
            similar_groups: frontendResults.similar_groups,
            quality_array: frontendResults.quality_array,
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
                slot.loadFailed = true;
                return null;
            })
        );
        await Promise.all(loadPromises);

        // Wait for all images to be fully rendered
        await this.delay(800);

        await this.respectScreenshotRateLimit();

        const batchScreenshot = await this.captureBatchScreenshot();

        let uploaded = 0;
        for (let i = 0; i < screenshotSlots.length; i++) {
            const slot = screenshotSlots[i];
            const photo = photoBatch[i];

            if (slot.loadFailed) {
                continue;
            }

            try {
                const croppedImage = await this.cropImageFromBatch(batchScreenshot, slot.bounds);

                if (croppedImage) {

                    photo.capturedImageData = croppedImage;

                    const result = await this.frontendSessionManager.addImage(sessionId, photo.id, croppedImage,photo.url);

                    if (result.success) {
                        uploaded++;
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

    calculateOptimalBatchLayout() {
        const devicePixelRatio = window.devicePixelRatio || 1;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const targetImageSize = 400;

        const slotSize = Math.round(targetImageSize / devicePixelRatio);
        const slotSpacing = 20;
        const marginX = 50; 
        const marginY = 100; 

        const availableWidth = viewportWidth - (marginX * 2);
        const maxImagesPerRow = Math.floor((availableWidth + slotSpacing) / (slotSize + slotSpacing));

        const availableHeight = viewportHeight - marginY - 50; 
        const maxRows = Math.floor((availableHeight + slotSpacing) / (slotSize + slotSpacing));

        const maxImagesPerBatch = Math.max(1, maxImagesPerRow * maxRows);

        const actualImagesPerRow = Math.min(maxImagesPerRow, maxImagesPerBatch);
        const actualRows = Math.ceil(maxImagesPerBatch / actualImagesPerRow);

        const screenshotWidth = (actualImagesPerRow * slotSize) + ((actualImagesPerRow - 1) * slotSpacing) + (marginX * 2);
        const screenshotHeight = (actualRows * slotSize) + ((actualRows - 1) * slotSpacing) + marginY + 50;

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

    showScreenshotArea(layout) {
        this.closeInitialPopup()
        const screenshotArea = document.getElementById('pc-screenshot-area');
        if (screenshotArea) {
            const SCREENSHOT_X = layout.marginX;
            const SCREENSHOT_Y = layout.marginY;
            const SCREENSHOT_WIDTH = layout.screenshotWidth;
            const SCREENSHOT_HEIGHT = layout.screenshotHeight;

            screenshotArea.style.right = '';
            screenshotArea.style.transform = '';
            screenshotArea.style.margin = '';
            screenshotArea.style.marginLeft = '';
            screenshotArea.style.marginRight = '';

            screenshotArea.style.display = 'block';
            screenshotArea.style.position = 'fixed';
            screenshotArea.style.left = `${SCREENSHOT_X}px`;
            screenshotArea.style.top = `${SCREENSHOT_Y}px`;

            const leftStyle = `left: ${SCREENSHOT_X}px `;
            const existingStyle = screenshotArea.style.cssText;
            screenshotArea.style.cssText = existingStyle + '; ' + leftStyle;
            screenshotArea.style.width = `${SCREENSHOT_WIDTH}px`;
            screenshotArea.style.height = `${SCREENSHOT_HEIGHT}px`;
            screenshotArea.style.zIndex = '10005'; 
            screenshotArea.style.background = 'rgba(255, 255, 255, 0.95)';
            screenshotArea.style.border = 'none';
            screenshotArea.style.borderRadius = '0px';
            screenshotArea.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';

            this.screenshotAreaBounds = {
                x: SCREENSHOT_X,
                y: SCREENSHOT_Y,
                width: SCREENSHOT_WIDTH,
                height: SCREENSHOT_HEIGHT
            };

            setTimeout(() => {
                const actualRect = screenshotArea.getBoundingClientRect();
            }, 100);
        }
    }

    hideScreenshotArea() {
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

        container.innerHTML = '';

        const screenshotSlots = [];
        for (let i = 0; i < photoBatch.length; i++) {
            const photo = photoBatch[i];
            const slot = this.createScreenshotSlot(photo, startIndex + i, layout);
            container.appendChild(slot.element);
            screenshotSlots.push(slot);
        }

        const loadPromises = screenshotSlots.map(slot =>
            this.loadImageInSlot(slot).catch(error => {
                slot.loadFailed = true;
                return null; 
            })
        );
        await Promise.all(loadPromises);

        await this.delay(800); 

        await this.respectScreenshotRateLimit();

        const batchScreenshot = await this.captureBatchScreenshot();

        let uploaded = 0;
        for (let i = 0; i < screenshotSlots.length; i++) {
            const slot = screenshotSlots[i];
            const photo = photoBatch[i];

            if (slot.loadFailed) {
                continue;
            }

            try {
                const croppedImage = await this.cropImageFromBatch(batchScreenshot, slot.bounds);

                if (croppedImage) {
                    this.debugSaveImage(croppedImage, `debug_image_${startIndex + i + 1}_${photo.id}`);

                    await this.uploadImageToSession(sessionId, photo.id, croppedImage);
                    uploaded++;
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
        const slotSize = layout.slotSize; 
        const targetImageSize = layout.targetImageSize; 
        // const spacing = layout.spacing;
        const spacing = 5;
        const startX = 10; 
        const startY = 10; 

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

        slot.innerHTML = `<div class="pc-loading-indicator">Loading ${index + 1}...</div>`;

        const absoluteX = (this.screenshotAreaBounds?.x || layout.marginX) + left;
        const absoluteY = (this.screenshotAreaBounds?.y || layout.marginY) + top;

        setTimeout(() => {
                const container = document.getElementById('pc-screenshot-container');
                if (container && container.querySelectorAll('.pc-screenshot-slot').length > 0) {
                    document.body.classList.add('pc-overlay-active');
                }
            }, 0)
        return {
            element: slot,
            photo: photo,
            bounds: {
                x: left,        
                y: top,         
                absoluteX: absoluteX,  
                absoluteY: absoluteY,  
                width: slotSize,       
                height: slotSize,
                cropWidth: targetImageSize,   
                cropHeight: targetImageSize,
                borderOffset: 0,  
                devicePixelRatio: layout.devicePixelRatio
            },
            slotId: slotId
        };
    }

    async loadImageInSlot(slot) {
        return new Promise((resolve, reject) => {
            try {
                const fullResUrl = this.getFullResolutionUrl(slot.photo.element);
                if (!fullResUrl) {
                    reject(new Error(`Could not extract URL for ${slot.photo.id}`));
                    return;
                }
                const img = document.createElement('img');
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.display = 'block';

                img.onload = () => {
                    slot.element.innerHTML = '';
                    slot.element.appendChild(img);
                    resolve();
                };

                img.onerror = () => {
                    reject(new Error(`Failed to load image for ${slot.photo.id}`));
                };
                img.src = fullResUrl;

            } catch (error) {
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
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = bounds.cropWidth || 400;
            canvas.height = bounds.cropHeight || 400;
            const img = new Image();

            return new Promise((resolve, reject) => {
                img.onload = () => {
                    try {
                        const viewportWidth = window.innerWidth;
                        const viewportHeight = window.innerHeight;
                        const scaleX = img.width / viewportWidth;
                        const scaleY = img.height / viewportHeight;
                        const scaleFactor = Math.max(scaleX, scaleY);
                        const baseCropX = bounds.absoluteX || ((this.screenshotAreaBounds?.x || 50) + bounds.x);
                        const baseCropY = bounds.absoluteY || ((this.screenshotAreaBounds?.y || 100) + bounds.y);

                        const scaledCropX = Math.round(baseCropX * scaleFactor);
                        const scaledCropY = Math.round(baseCropY * scaleFactor);

                        const sourceSlotSize = bounds.width;
                        const scaledSourceWidth = Math.round(sourceSlotSize * scaleFactor);
                        const scaledSourceHeight = Math.round(sourceSlotSize * scaleFactor);

                        ctx.drawImage(
                            img,
                            scaledCropX, scaledCropY, scaledSourceWidth, scaledSourceHeight,  
                            0, 0, bounds.cropWidth || 400, bounds.cropHeight || 400  
                        );
                        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
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
        let mediaItem = this.photos.find(p => p.id === imageId);
        let mediaType = 'photo';

        if (!mediaItem) {
            mediaItem = this.videos.find(v => v.id === imageId);
            mediaType = 'video';
        }

        if (mediaItem) {
            mediaItem.capturedImageData = base64Data;
        }

        const blob = await this.base64ToBlob(base64Data, 'image/jpeg');

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
        return result;
    }

    async base64ToBlob(base64Data, mimeType) {
        const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return new Blob([bytes], { type: mimeType });
    }

    async finalizeSession(sessionId) {
        this.updateProgress(85, 'Finalizing session and starting analysis...');

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

            if (status.analysis_status === 'pending') {
                this.updateProgress(87, 'Starting similarity analysis...');
            } else if (status.analysis_status === 'analyzing') {
                if (status.analysis_progress) {
                    this.updateProgress(
                        87 + (status.analysis_progress * 0.13), 
                        `Analyzing similarities: ${status.analysis_progress.toFixed(4)}% (${status.processed_images}/${status.total_images} comparisons)`
                    );
                } else {
                    this.updateProgress(87, 'Analyzing photo similarities...');
                }
            } else if (status.analysis_status === 'completed') {
                return {
                    success: true,
                    total_images: status.total_images,
                    comparisons: status.total_comparisons,
                    similar_groups: status.similar_groups,
                    quality_array: status.allResults
                };
            } else if (status.analysis_status === 'error') {
                throw new Error(status.error || 'Analysis failed on server');
            }

            await this.delay(pollInterval);
        }

        throw new Error('Analysis timeout - server took too long to complete');
    }

    async captureImageWithTempElement(imageUrl, photoId) {
        return new Promise((resolve, reject) => {
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

            timeoutId = setTimeout(() => {
                console.error(`Timeout loading image: ${photoId}`);
                cleanup();
                reject(new Error('Image load timeout'));
            }, 10000);

            img.onload = async () => {
                try {
                    await this.waitForImageFullRender(img, container);

                    await this.respectScreenshotRateLimit();

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

            container.appendChild(img);
            document.body.appendChild(container);

            img.src = imageUrl;
        });
    }

    async waitForImageFullRender(img, container) {

        await new Promise(resolve => {
            let frameCount = 0;
            const waitForFrames = () => {
                frameCount++;
                if (frameCount >= 3) { 
                    resolve();
                } else {
                    requestAnimationFrame(waitForFrames);
                }
            };
            requestAnimationFrame(waitForFrames);
        });

        const imageSize = img.naturalWidth * img.naturalHeight;
        const sizeBasedDelay = Math.min(Math.max(imageSize / 1000000 * 200, 300), 1500); 

        await this.delay(sizeBasedDelay);

        await this.waitForImageVisible(img, container);
    }

    async waitForImageVisible(img, container) {
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            const containerRect = container.getBoundingClientRect();
            const imgRect = img.getBoundingClientRect();
            if (imgRect.width > 100 && imgRect.height > 100 &&
                containerRect.width > 100 && containerRect.height > 100) {
                const computedStyle = window.getComputedStyle(img);
                if (computedStyle.opacity !== '0' && computedStyle.visibility !== 'hidden') {
                    return;
                }
            }
            await this.delay(100);
            attempts++;
        }

        console.warn(`Image visibility check timed out after ${maxAttempts} attempts`);
    }

    async respectScreenshotRateLimit() {
        const now = Date.now();
        const timeSinceLastScreenshot = now - this.lastScreenshotTime;
        const minInterval = 600; 

        if (timeSinceLastScreenshot < minInterval) {
            const waitTime = minInterval - timeSinceLastScreenshot;
            await this.delay(waitTime);
        }

        this.lastScreenshotTime = Date.now();
    }

    getFullResolutionUrl(bgElement) {
        try {
            if (!bgElement) {
                return null;
            }
            const bgElements = bgElement.querySelectorAll('*[style*="background-image"], *[data-latest-bg]');

            for (let i = 0; i < bgElements.length; i++) {
                const element = bgElements[i];

                const dataLatestBg = element.getAttribute('data-latest-bg');
                if (dataLatestBg && dataLatestBg.trim() !== '') {
                    return this.convertToFullResolution(dataLatestBg);
                }

                const style = element.getAttribute('style');
                if (style) {

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

                            if (imageUrl !== 'none' && imageUrl.length > 5) {
                                const firstUrl = imageUrl.split(',')[0].trim();
                                return this.convertToFullResolution(firstUrl);
                            } else {
                            }
                        }
                    }
                } else {
                }
            }

            const elementStyle = bgElement.getAttribute('style');
            if (elementStyle && elementStyle.includes('background-image')) {
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

                        if (imageUrl !== 'none' && imageUrl.length > 5) {
                            const firstUrl = imageUrl.split(',')[0].trim();
                            return this.convertToFullResolution(firstUrl);
                        }
                    }
                }
            }

            return null;

        } catch (error) {
            console.error('❌ Error extracting full resolution URL:', error);
            return null;
        }
    }

    convertToFullResolution(thumbnailUrl) {
        try {
            const baseUrlMatch = thumbnailUrl.match(/^(.+)=w\d+-h\d+(-[^?]+)?(\?.*)?$/);
            if (baseUrlMatch) {
                const baseUrl = baseUrlMatch[1];
                const suffix = baseUrlMatch[2] || '-no'; 
                const queryParams = baseUrlMatch[3] || '';
                const fullResUrl = `${baseUrl}=w1200-h1200${suffix}${queryParams}`;
                return fullResUrl;
            }

            console.warn('Could not convert URL to full resolution, using original:', thumbnailUrl.substring(0, 100));
            return thumbnailUrl;

        } catch (error) {
            console.error('Error converting to full resolution:', error);
            return thumbnailUrl;
        }
    }

    async captureElementBackgroundToCanvas(element) {
        try {
            const rect = element.getBoundingClientRect();
            if (rect.width < 10 || rect.height < 10) {
                return null;
            }
            return await this.captureRenderedElement(element, rect);

        } catch (error) {
            console.error('Error capturing element background:', error);
            return null;
        }
    }

    async captureRenderedElement(element, rect) {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const maxSize = 300;
            const scale = Math.min(maxSize / rect.width, maxSize / rect.height, 1);
            canvas.width = rect.width * scale;
            canvas.height = rect.height * scale;
            if ('html2canvas' in window) {
                const canvasElement = await html2canvas(element, {
                    width: canvas.width,
                    height: canvas.height,
                    scale: scale,
                    useCORS: true,
                    allowTaint: false
                });
                return canvasElement.toDataURL('image/jpeg', 0.8);
            }
            return await this.fallbackElementCapture(element, canvas, ctx, scale);

        } catch (error) {
            console.error('Error capturing rendered element:', error);
            return null;
        }
    }

    async fallbackElementCapture(element, canvas, ctx, scale) {
        try {
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            const backgroundImage = style.backgroundImage;

            let urlHash = '';
            if (backgroundImage && backgroundImage !== 'none') {
                const urlMatch = backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);
                if (urlMatch) {
                    urlHash = this.simpleHash(urlMatch[1]);
                }
            }

            const fingerprint = {
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                urlHash: urlHash,
                backgroundSize: style.backgroundSize,
                backgroundPosition: style.backgroundPosition
            };

            ctx.fillStyle = `hsl(${urlHash % 360}, 70%, 80%)`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = `hsl(${urlHash % 360}, 90%, 60%)`;
            const patternSize = 20;
            for (let x = 0; x < canvas.width; x += patternSize) {
                for (let y = 0; y < canvas.height; y += patternSize) {
                    if ((x + y) % (patternSize * 2) === 0) {
                        ctx.fillRect(x, y, patternSize / 2, patternSize / 2);
                    }
                }
            }

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
            hash = hash & hash; 
        }
        return Math.abs(hash);
    }


    getTempElementInfo(elementId) {
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
        this.processedPhotosCount = results.total_images || this.photos.length;
        this.restorePhotoCountDisplay();
        chrome.storage.local.set({
            analysisResults: results,
            photos: this.photos,
            timestamp: Date.now()
        });
        this.createResultsOverlay(results);
    }

    createResultsOverlay(results) {
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
    <div class="analysis-pesults-popup fixed top-0 left-0  w-full h-full before-overlay">
        <div class="ap-popupu-in h-full flex items-center w-[1250px] mx-auto relative">
             <div class="container mx-auto px-3 max-[767px]:px-2 w-[100%] !max-w-full">
                <div class="row">
                   <div class=" bg-white max-[1600px]:rounded-[20px] rounded-[30px]">
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
                       <div class="flex flex-col gap-3 max-height overflow-auto">
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
                                    <input id="pc-similarity-threshold" type="range" class="w-full" min="0.1" max="1.0" value="${(results.similarity_threshold || 75) / 100}" step="0.01">
                                      <span id="pc-threshold-value">${results.similarity_threshold || 75}%</span>
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

                        

                       <div class="analysis-results bg-white p-6 rounded-[20px] border border-[#e2e8f0] shadow-lg rounded-[8px]">
                          <div class="flex justify-between items-center">
                             <h4 class="text-[18px] font-semibold text-[#0f172a]">Analysis Results</h4>
                             <p class="text-[#64748b] !text-[14px] pl-[14px]">${results.similar_groups.length}<span> groups found •</span>  ${this.photos.length} <span> images processed</span></p>

                             <button id="group-summary" class="font-medium !text-[12px] px-[7px] py-[5px] bg-[#f5f5f4] rounded-[8px] ml-auto text-[#0f172a]"></button>
                             
                             <button id="select-all-btn" class="font-medium !text-[14px] px-[12px] py-[8px] border border-[#e7e5e4] rounded-[8px] mx-[8px]">Select All</button>
                             <button id="process-selected-groups" style="display:none;" class="font-medium !text-[14px] px-[12px] py-[8px] border border-[#ef4444] bg-[#ef4444] rounded-[8px] text-white delete-to-google">Process Selected Groups</button>
                          </div>
                        </div>

                     <div class="p-[24px] px-[0px]">
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
        const mediaArray = mediaType === "video" ? this.videos : this.photos;

        return groups.map((group, gIndex) => {
        const similarityPercent = Math.round(group.similarity_score * 100);

        const bestImage = group.image_ids.reduce((best, imgId) => {
        const q = results.quality_array.find((qq) => qq.name.startsWith(imgId));
        if (!q) return best;
        if (!best) return { id: imgId, score: q.overallScore };
        return q.overallScore > best.score ? { id: imgId, score: q.overallScore } : best;
        }, null);
        const sortedIds = [...group.image_ids].sort((a, b) => {
        const qa = results.quality_array.find(q => q.name.startsWith(a));
        const qb = results.quality_array.find(q => q.name.startsWith(b));
        return (qb?.overallScore || 0) - (qa?.overallScore || 0); 
        });

    return `
      <div class="analysisresults-group bg-white border border-[#e2e8f0] rounded-[12px] shadow-sm mb-8">
        <!-- Group Header -->
        <div class="p-[16px] border-b border-[#e2e8f0] bg-[#f8fafc] rounded-[12px]">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-[10px]">
              <span>
                <button class="toggle-group-btn">
                <svg xmlns="http://www.w3.org/2000/svg" 
                    class="h-5 w-5 text-[#94a3b8]" 
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="m6 9 6 6 6-6" />
                </svg>
                </button>
              </span>
              <span>
                <input type="checkbox" class="border border-[#2094f3] rounded-[8px]">
              </span>
              <span>img</span>
              <span class="font-semibold text-[#0f172a] !text-[16px]">Group ${gIndex + 1}</span>
              <span class="text-[12px] bg-[#f5f5f4] rounded-full px-[8px] py-[2px]">
                ${group.image_ids.length} <span>images</span>
              </span>
              <span class="text-[#64748b] !text-[12px]">
                Select group to process • Keep button to preserve images
              </span>
            </div>
            <div class="flex items-center gap-[5px]">
              <span class="flex flex-col">
                <span class="text-[#0f172a] font-medium !text-[14px] text-right">
                  ${similarityPercent}% similar
                </span>
                <span class="text-[#64748b] font-medium !text-[12px] text-right">
                 Keep: ${group.image_ids.filter(id => bestImage && bestImage.id === id).length} • 
                Delete: ${group.image_ids.length - (group.image_ids.filter(id => bestImage && bestImage.id === id).length)}
                </span>
              </span>
              <button class="select-group-btn text-[14px] px-[11px] py-[8px] rounded-[8px] font-semibold text-[#3b4a5e]">
                Select Group
              </button>
              <button  data-group="${gIndex}" class="dismiss-group-btn text-[14px] px-[11px] py-[8px] rounded-[8px] font-semibold text-[#dc2626]">
                Dismiss Group
              </button>
            </div>
          </div>
        </div>

        <!-- Group Body -->
        <div class="group-body p-[24px]">
          <div class="grid grid-cols-3 gap-5">
                ${sortedIds.map((id, idx) => {
              const mediaItem = mediaArray.find((item) => item.id === id);
              if (!mediaItem) return "";

                const totalImages = sortedIds.length;
               let tempRank;
                if (totalImages <= 10) {
                    tempRank = 10 - idx; 
                } else {
                    const step = 9 / (totalImages - 1);
                    tempRank = (10 - idx * step).toFixed(1); 
                }

              const fullSizeUrl = this.convertToFullResolution(mediaItem.url);
              const quality = results.quality_array.find((q) =>
                q.name.startsWith(id)
              );
            const isBest = bestImage && bestImage.id === id;
              const qualityHTML = quality
                ? `
                 <h4 class="text-[13px] font-semibold mb-[4px] text-left">Technical Quality</h4>
                  <ul class="grid grid-cols-2 gap-[3px] my-[8px]">
                    <li class="bg-gradient flex items-center p-[2px] px-[2px] rounded-[6px]"><span class="text-[11px] dec-color dark-color">Blur: ${quality.technical.blurScore.toFixed(2)}</span></li>
                    <li class="bg-gradient flex items-center p-[2px] px-[2px] rounded-[6px]"><span class="text-[11px] dec-color dark-color">Sharpness: ${quality.technical.sharpnessScore.toFixed(2)}</span></li>
                    <li class="bg-gradient flex items-center p-[2px] px-[2px] rounded-[6px]"><span class="text-[11px] dec-color dark-color">Exposure: ${quality.technical.exposureQuality.toFixed(2)}</span></li>
                    <li class="bg-gradient flex items-center p-[2px] px-[2px] rounded-[6px]"><span class="text-[11px] dec-color dark-color">Contrast: ${quality.technical.contrastScore.toFixed(2)}</span></li>
                    <li class="bg-gradient flex items-center p-[2px] px-[2px] rounded-[6px]"><span class="text-[11px] dec-color dark-color">Noise: ${quality.technical.noiseLevel.toFixed(2)}</span></li>
                    <li class="bg-gradient flex items-center p-[2px] px-[2px] rounded-[6px]"><span class="text-[11px] dec-color dark-color">Color Balance: ${quality.technical.colorBalance.toFixed(2)}</span></li>
                     <li class="bg-gradient flex items-center p-[2px] px-[2px] rounded-[6px] hidden"><span class="qualityTierValue text-[11px] dec-color dark-color">${quality.qualityTier}</span></li>
                  </ul>
                   ${quality.faces 
                    ? ` <h4 class="text-[13px] font-semibold mb-[4px] text-left">Face Quality</h4>
                    <ul class="grid grid-cols-2 gap-[3px] my-[8px]">
                        <li class="bg-gradient flex items-center p-[2px] px-[2px] rounded-[6px]"><span class="text-[11px] dec-color dark-color">Eye Contact:  ${quality.faces.eyeContactScore.toFixed(2)}</span></li>
                        <li class="bg-gradient flex items-center p-[2px] px-[2px] rounded-[6px]"><span class="text-[11px] dec-color dark-color">Face Centering: ${quality.faces.faceCentering.toFixed(2)}</span></li>
                        <li class="bg-gradient flex items-center p-[2px] px-[2px] rounded-[6px]"><span class="text-[11px] dec-color dark-color">Face Size: ${quality.faces.faceSize.toFixed(2)}</span></li>
                        <li class="bg-gradient flex items-center p-[2px] px-[2px] rounded-[6px]"><span class="text-[11px] dec-color dark-color">Lighting: ${quality.faces.lightingQuality.toFixed(2)}</span></li>
                        <li class="bg-gradient flex items-center p-[2px] px-[2px] rounded-[6px]"><span class="text-[11px] dec-color dark-color">Portrait Score: ${quality.faces.portraitScore.toFixed(2)}</span></li>
                        <li class="bg-gradient flex items-center p-[2px] px-[2px] rounded-[6px]"><span class="text-[11px] dec-color dark-color">Face Count: ${quality.faces.faceCount.toFixed(2)}</span></li>
                        </ul>`
                    : ""}
                  <span class="h-[1px] flex items-center justify-center w-full bg-[#DBF7FE] my-[8px]"></span>
                  <p class="">Overall Score: ${quality.overallScore.toFixed(2)}%</p>
                `
                : "";

              return `
                <article class="pc-image-item border rounded-[8px] border-[1px] 
                ${isBest ? 'border-[#10b981]' : 'border-[#ef4444]'} 
                mb-6 relative"
                  data-photo-id="${mediaItem.id}" 
                  data-photo-url="${mediaItem.url}" 
                  data-media-type="${mediaType}">

                  <div class="p-[16px] bg-white  flex gap-[5px] items-center rounded-t-[12px] rounded-[12px]">
                    <div class="quality_a_details">
                      <span class="text-[#9333ea] font-semibold !text-[15px]">${tempRank}/10</span>
                      <span class="text-[#94a3b8] !text-[15px]">
                        (${quality ? quality.overallScore.toFixed(2) : 0}%)
                      </span>
                      
                <div class="quality_a_details_po rounded-[10px] border p-[10px] w-[251px] absolute top-[40px] -left-[20px] z-[999] bg-white">
                    <div class="articlecontent">
                    <h4 class="text-[14px] font-bold dark-color">Quality Assessment Details</h4>
                    <span class="h-[1px] flex items-center justify-center w-full bg-[#DBF7FE] my-[8px]"></span>

                    ${qualityHTML}
                    </div>
                </div>
                    </div>
                   <span class="ml-auto text-white text-[12px] 
                    ${isBest ? "bg-[#10b981] keep-span" : "bg-[#ef4444] toggle-delete-span"} 
                    px-[8px] py-[5px] rounded-md flex gap-[2px] items-center
                    ${!isBest ? "will-delete-btn delete-to-google" : ""}
                    ">
                     ${isBest 
                    ? "Keeping this file" 
                    : `<svg class="w-[14px] text-[#fff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        <line x1="10" x2="10" y1="11" y2="17"></line>
                        <line x1="14" x2="14" y1="11" y2="17"></line>
                    </svg> Will delete`}
                    </span>

                  </div>

                  <div class="relative h-[268px] overflow-hidden flex bg-[#f8fafc] items-center justify-center">
                    <img src="${fullSizeUrl}" alt="${mediaItem.ariaLabel}" class="w-full h-[190px] object-cover">
                  </div>

                  <div class="p-[16px] bg-white rounded-b-[12px] rounded-[12px]">
                    <h4 class="text-[14px] font-semibold text-[#0f172a] mb-1 truncate">${mediaItem.ariaLabel}</h4>
        <div class="pc-image-size" data-photo-id="${mediaItem.id}"></div>
                    <div class="flex items-center justify-between">
                      <button class="inline-flex items-center justify-center gap-1 px-[8px] py-[5px] border rounded-md text-[12px] view-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3">
                            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        View
                    </button>


                    <button 
        class="flex items-center px-[8px] py-[5px] border rounded-md text-[12px] 
        ${isBest ? 'bg-[#10b981] text-white keep-btn' : 'bg-transparent text-[#ef4444] toggle-delete-btn'}">
        <span>
        ${isBest 
          ? `<svg viewBox="0 0 130.2 130.2" class="check-icon w-[22px]">
               <polyline fill="none" stroke="#fff" stroke-width="6" points="100.2,40.2 51.5,88.8 29.8,67.5 "/>
             </svg>` 
          : `<svg viewBox="0 0 130.2 130.2" class="close-icon w-[22px]">
               <line fill="none" stroke="#f00" stroke-width="6" x1="34.4" y1="37.9" x2="95.8" y2="92.3"/>
               <line fill="none" stroke="#f00" stroke-width="6" x1="95.8" y1="38" x2="34.4" y2="92.2"/>
             </svg>`}
        </span>
        ${isBest ? 'Keep' : 'Delete'}
        </button>


                    </div>
                  </div>
                </article>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    `;
  }).join("");
};

                            return `
                                <div class="">
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


        let selectedGroups = new Set();

// Handle Select / Deselect Group
function toggleGroup($group, isSelect) {
    const $btn = $group.find('.select-group-btn');
    const $checkbox = $group.find('input[type=checkbox]');
    const groupIndex = $group.index();

    if (isSelect) {
        selectedGroups.add(groupIndex);
        $btn.text('Deselect Group');
        $checkbox.prop('checked', true);
    } else {
        selectedGroups.delete(groupIndex);
        $btn.text('Select Group');
        $checkbox.prop('checked', false);
    }

    updateAnalysisResults();
}

overlay.on('click', '.select-group-btn', function () {
    const $group = $(this).closest('.analysisresults-group');
    const groupIndex = $group.index();
    const isSelect = !selectedGroups.has(groupIndex); // toggle
    toggleGroup($group, isSelect);
});

// Checkbox change
overlay.on('change', '.analysisresults-group input[type=checkbox]', function () {
    const $group = $(this).closest('.analysisresults-group');
    const isSelect = $(this).is(':checked');
    toggleGroup($group, isSelect);
});

function updateAnalysisResults() {
    const $summary = overlay.find('#group-summary'); 
    const $processBtn = overlay.find('#process-selected-groups'); 
    
    if (selectedGroups.size === 0) {
        $summary.text(""); 
        $processBtn.hide();
    } else {
        $summary.text(`${selectedGroups.size} Groups selected`);
        $processBtn.show();
    }
}
overlay.on('click', '#select-all-btn', function () {
    const $btn = $(this);
    const $processBtn = overlay.find('#process-selected-groups');

    if ($btn.text().trim() === "Select All") {
        overlay.find('.analysisresults-group').each(function (idx) {
            const $group = $(this);
            const $selectBtn = $group.find('.select-group-btn');

            selectedGroups.add(idx);
            $selectBtn.text('Deselect Group');
            $group.find('input[type=checkbox]').prop('checked', true);
        });

        $btn.text("Deselect All");
        $processBtn.show();

    } else {
        overlay.find('.analysisresults-group').each(function (idx) {
            const $group = $(this);
            const $selectBtn = $group.find('.select-group-btn');

            selectedGroups.delete(idx);
            $selectBtn.text('Select Group');
            $group.find('input[type=checkbox]').prop('checked', false);
        });

        $btn.text("Select All");
        $processBtn.hide();
    }

    updateAnalysisResults();
});

        // overlay.on('click', '.will-delete-btn', function (e) {
        // e.stopPropagation(); 
        // $(this).closest('.pc-image-item').remove();
        // });

overlay.on('click', '.toggle-delete-btn, .keep-btn', function(e) {
    e.stopPropagation();

    const $btn = $(this);
    const $item = $btn.closest('.pc-image-item');

    // Find the span inside same item
    const $span = $item.find('span.toggle-delete-span, span.keep-span');

    if ($btn.hasClass('toggle-delete-btn')) {
        // DELETE -> KEEP
        $btn.removeClass('bg-transparent text-[#ef4444] toggle-delete-btn')
            .addClass('bg-[#10b981] text-white keep-btn')
            .html(`
                <span>
                <svg viewBox="0 0 130.2 130.2" class="check-icon w-[22px]">
                    <polyline fill="none" stroke="#fff" stroke-width="6" points="100.2,40.2 51.5,88.8 29.8,67.5 "/>
                </svg>
                </span>
                Keep
            `);

        // Update span
        if ($span.length) {
            $span.removeClass('bg-[#ef4444] toggle-delete-span will-delete-btn')
                 .addClass('bg-[#10b981] keep-span')
                 .text('Keeping this file');
        }

        // Update border
        $item.removeClass('border-[#ef4444]').addClass('border-[#10b981]');

    } else if ($btn.hasClass('keep-btn')) {
        // KEEP -> DELETE
        $btn.removeClass('bg-[#10b981] text-white keep-btn')
            .addClass('bg-transparent text-[#ef4444] toggle-delete-btn')
            .html(`
                <span>
                <svg viewBox="0 0 130.2 130.2" class="close-icon w-[22px]">
                    <line fill="none" stroke="#f00" stroke-width="6" x1="34.4" y1="37.9" x2="95.8" y2="92.3"/>
                    <line fill="none" stroke="#f00" stroke-width="6" x1="95.8" y1="38" x2="34.4" y2="92.2"/>
                </svg>
                </span>
                Delete
            `);

        // Update span
        if ($span.length) {
            $span.removeClass('bg-[#10b981] keep-span')
                 .addClass('bg-[#ef4444] toggle-delete-span will-delete-btn delete-to-google')
                 .html(`<svg class="w-[14px] text-[#fff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          <line x1="10" x2="10" y1="11" y2="17"></line>
                          <line x1="14" x2="14" y1="11" y2="17"></line>
                        </svg> Will delete`);
        }

        // Update border
        $item.removeClass('border-[#10b981]').addClass('border-[#ef4444]');
    }
});



        $('#pc-results-close_').on('click', () => {
            this.cleanupViewportObserver();
            overlay.remove();
        });

        $('body').on('click', '.dismiss-group-btn', function () {
        const groupIndex = $(this).data('group');
        $(this).closest('.analysisresults-group').remove();
        });
        
        $('#process-selected-groups').on('click', async () => {
            await this.finalizeSelectionAndSync(overlay);
        });

        $(document).on('click', '.toggle-group-btn', function () {
            const $btn = $(this);
            const $group = $btn.closest('.analysisresults-group');
            const $body = $group.find('.group-body');

            // Show / Hide body
            $body.toggleClass('hidden');

            // Change arrow (down ↔ up)
            const $icon = $btn.find('svg path');
            if ($body.hasClass('hidden')) {
                $icon.attr("d", "m9 18 6-6-6-6");
            } else {
                $icon.attr("d", "m6 9 6 6 6-6");
            }
        });
        $(document).on("click", ".view-btn", function () {
        const $article = $(this).closest("article.pc-image-item");
        
        const imageUrl = $article.data("photo-url");
        const fileName = $article.find("h4.truncate").text().trim() || "Image";
        const dimensions = $article.find(".pc-image-size span:first .img-size").text().trim() || "Unknown";
        const qualityTier =$article.find(".qualityTierValue").text().trim() || "Unknown";
        const size = (() => {
            const raw = $article.find(".pc-size-info").text().trim() || "Unknown";
            return raw.includes("takes") ? raw.split("takes")[1].trim() : raw;
        })();
         const rotateIconUrl = chrome.runtime.getURL('../icons/rotate.svg');
        const downloadIconUrl = chrome.runtime.getURL('../icons/downloads.svg');
        const zoomInIconUrl = chrome.runtime.getURL('../icons/zoom-in.svg');
        const zoomOutIconUrl = chrome.runtime.getURL('../icons/zoom-out.svg');
        const logo_IconUrl = chrome.runtime.getURL('../icons/logo.png');

        const modal = $(`

        <div class="ap-popupu-in product_popupu_img h-full flex items-center  mx-auto relative custom-modal-overlay">
         <div class="custom-modal">
             <div class="w-[850px] mx-auto px-3 max-[767px]:px-2">
                <div class="row">
                   <div class="bg-white max-[1600px]:rounded-[30px] rounded-[40px] border">
                    <div class="flex items-center justify-between background-one p-5 max-[1600px]:rounded-[30px] rounded-[40px] rounded-b-[0]">
                        <div class="headerlogo">
                            <a href="#" class="flex items-center gap-[5px] font-bold dark-color">
                                <span class="flex w-[50px] max-[767px]:w-[45px] items-center justify-center"><img class="logo_-img rounded-[10px]" src="icons/tricon128.png" alt="logo"></span>
                            </a>
                        </div>
                        <div class="headermenu">
                            <div id="extension-version" class="version">
                                <a id="pc-results-close_" href="#" class=" close-modal g-close-btn font-semibold  w-[30px] h-[30px] rounded-full bg-white flex justify-center items-center"><i class="fa-solid fa-xmark dec-color "></i></a>
                            </div>
                        </div>
                    </div>
                    <div class="p-5 flex flex-col">
                       <div class="flex flex-col gap-3">
                        <div class="articlecontent">
                            <h4 class="font22 font-bold dark-color">${fileName}</h4>
                            <div class="flex gap-[7px] mt-2 mb-7  items-center">
                                <span class="p-1 px-2 rounded-[8px] border border-color-two bg-gradient flex items-center gap-1 text-[13px] dark-color">Dimensions: ${dimensions}</span>
                                <span class="p-1 px-2 rounded-[8px] border border-color-two bg-gradient flex items-center gap-1 text-[13px] dark-color">Size: ${size}</span>
                                <span class="p-1 px-2 rounded-[8px] border border-color-two bg-gradient flex items-center gap-1 text-[13px] dark-color">${qualityTier}</span>
                            </div>
                            <div class="flex gap-[7px] items-center">
                                <span class="cursor-pointer zoom-out rounded-[10px] border-color-two border p-[6px] px-[13px] shadow-[6px_6px_10px_#f5f8ff] text-[13px] gap-1.5 dark-color flex items-center"><span class="flex w-[18px] items-center justify-center object-cover"><img src="icons/tricon128.png" alt="icon" class="zoom-out-img w-full h-full"></span>Zoom Out</span>
                               
                                <span class="zoom-value text-[13px] dark-color flex items-center">100%</span>
                               
                                <span class="cursor-pointer zoom-in rounded-[10px] border-color-two border p-[6px] px-[13px] shadow-[6px_6px_10px_#f5f8ff] text-[13px] gap-1.5 dark-color flex items-center"><span class="flex w-[18px] items-center justify-center object-cover"><img src="icons/tricon128.png" alt="icon" class="zoom-in-img  w-full h-full"></span>Zoom In</span>
                                <span class="cursor-pointer rotate rounded-[10px] border-color-two border p-[6px] px-[13px] shadow-[6px_6px_10px_#f5f8ff] text-[13px] gap-1.5 dark-color flex items-center"><span class="flex w-[18px] items-center justify-center object-cover"><img src="icons/tricon128.png" alt="icon" class="rotate-img w-full h-full"></span>Rotate</span>
                                <span class="cursor-pointer reset rounded-[10px] border-color-two border p-[6px] px-[13px] shadow-[6px_6px_10px_#f5f8ff] text-[13px] gap-1.5 dark-color flex items-center">Reset View</span>
                                <span class="cursor-pointer download-btn rounded-[10px] border-color-two border p-[6px] px-[13px] shadow-[6px_6px_10px_#f5f8ff] text-[13px] gap-1.5 dark-color ml-auto flex items-center"><span class="flex w-[18px] items-center justify-center object-cover"><img src="icons/tricon128.png" alt="icon" class="download-img  w-full h-full"></span> Download</span>
                            </div>

                            <div class="product_popupu_img mt-10">
                                <span class="w-full h-[450px] flex justify-center overflow-hidden items-center rounded-3xl border-color-two border ">
                                    <img src="${imageUrl}" alt="${fileName}" class="modal-image w-full h-full object-cover rounded-3xl" />
                                </span>
                            </div>
                        </div>
                       </div>
                    </div>
                   </div>
                </div>
            </div>
               </div>
        </div>
    `);
        modal.find('.rotate-img').attr('src', rotateIconUrl); 
        modal.find('.download-img').attr('src', downloadIconUrl); 
        modal.find('.zoom-in-img').attr('src', zoomInIconUrl); 
        modal.find('.zoom-out-img').attr('src', zoomOutIconUrl);
        modal.find('.logo_-img').attr('src',logo_IconUrl)
        let zoom = 1;
        let rotation = 0;
        const $img = modal.find(".modal-image");
        const $zoomValue = modal.find(".zoom-value"); 

        modal.on("click", ".zoom-in", function() {
        zoom = Math.min(zoom + 0.25, 3);
        $img.css("transform", `scale(${zoom}) rotate(${rotation}deg)`);
        $zoomValue.text(Math.round(zoom*100) + "%");
        });

        modal.on("click", ".zoom-out", function() {
        zoom = Math.max(zoom - 0.25, 0.25);
        $img.css("transform", `scale(${zoom}) rotate(${rotation}deg)`);
        $zoomValue.text(Math.round(zoom*100) + "%");
        });

        modal.on("click", ".rotate", function() {
        rotation = (rotation + 90) % 360;
        $img.css("transform", `scale(${zoom}) rotate(${rotation}deg)`);
        });

        modal.on("click", ".reset", function() {
        zoom = 1;
        rotation = 0;
        $img.css("transform", `scale(${zoom}) rotate(${rotation}deg)`);
        $zoomValue.text(Math.round(zoom*100) + "%");
        });


        modal.on("click", ".close-modal", function () {
            modal.remove();
        });

        modal.on("click", ".download-btn", function () {
            const a = document.createElement("a");
            a.href = imageUrl;
            a.download = fileName;
            a.click();
        });

        $("body").append(modal);
        });

        const scrollUpBtn =$('#pc-scroll-up');
        const scrollDownBtn = $('#pc-scroll-down');
        const resultsContainer = $(overlay).find('.pc-results-container');

        if (scrollUpBtn.length) {
            scrollUpBtn.on('click', () => {
                resultsContainer.animate({ scrollTop: 0 }, 'slow');
            });
        }

        if (scrollDownBtn.length) {
            scrollDownBtn.on('click', () => {
              resultsContainer.animate({ scrollTop: $resultsContainer[0].scrollHeight }, 'slow');
            });
        }

        // Add similarity threshold control functionality
        const $thresholdSlider = $('#pc-similarity-threshold');
        const $thresholdValue = $('#pc-threshold-value');
        const $reanalyzeBtn = $('#pc-reanalyze');

    // Slider change
    if ($thresholdSlider.length && $thresholdValue.length) {
        $thresholdSlider.on('input', function () {
            const percentage = Math.round(parseFloat($(this).val()) * 100);
            $thresholdValue.text(percentage + '%');
        });
    }

    // Re-analyze button click
    if ($reanalyzeBtn.length) {
        $reanalyzeBtn.on('click', async () => {
            const newThreshold = Math.round(parseFloat($thresholdSlider.val()) * 100);

            $reanalyzeBtn.prop('disabled', true).text('Re-analyzing...');
            this.showProgress(true);
            this.updateProgress(0, 'Starting re-analysis...');

            try {
                const sessionId = this.frontendSessionManager.currentSessionId;
                if (sessionId) {
                    this.frontendSessionManager.progressCallback = (progress, message) => {
                        this.updateProgress(progress, message);
                    };

                    await this.frontendSessionManager.analyzeSession(sessionId, newThreshold);
                    this.frontendSessionManager.progressCallback = null;

                    this.updateProgress(100, 'Re-analysis complete! Updating results...');

                    const updatedResults = this.transformFrontendResults(
                        this.frontendSessionManager.sessions[sessionId],
                        sessionId
                    );

                    await new Promise(resolve => setTimeout(resolve, 500));

                    this.showProgress(false);
                    $('#overlay').remove(); 
                    this.createResultsOverlay(updatedResults);
                }
            } catch (error) {
                console.error('❌ Error during re-analysis:', error);
                this.updateProgress(0, 'Re-analysis failed! Please try again.');

                setTimeout(() => {
                    this.showProgress(false);
                    alert('Error during re-analysis. Please try again.');
                    $reanalyzeBtn.prop('disabled', false).text('Re-analyze');
                }, 2000);

                return;
            } finally {
                if ($reanalyzeBtn.prop('disabled')) {
                    $reanalyzeBtn.prop('disabled', false).text('Re-analyze');
                }
            }
        });
    }
        this.loadImageSizes(overlay);
    }

    async synchronizeAllPhotoStates() {
        const overlay = document.getElementById('pc-results-overlay');
        if (!overlay) {
            console.warn('No overlay found for synchronization');
            return;
        }

        const imageItems = overlay.querySelectorAll('.pc-image-item');
        const photosToSelect = [];

        imageItems.forEach(imageItem => {
            const photoId = imageItem.getAttribute('data-photo-id');

             const groupContainer = imageItem.closest('.analysisresults-group');
             const checkbox = groupContainer.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked) {
                const shouldBeSelected = imageItem.querySelectorAll('.will-delete-btn');

                if (shouldBeSelected.length > 0) {
                    photosToSelect.push(photoId);
                }
            }
        });

        if (photosToSelect.length === 0) {
            return;
        }
        await this.scrollBasedPhotoSelection(photosToSelect);
    }

    async scrollBasedPhotoSelection(photoIdsToSelect) {
        const photosWithPositions = [];
        const photosWithoutPositions = [];
        for (const photoId of photoIdsToSelect) {
            const scrollPosition = this.photoScrollPositions.get(photoId);
            if (scrollPosition !== undefined) {
                photosWithPositions.push({ id: photoId, scrollPosition });
            } else {
                photosWithoutPositions.push(photoId);
            }
        }
        if (photosWithoutPositions.length > 0) {
        }
        photosWithPositions.sort((a, b) => a.scrollPosition - b.scrollPosition);

        const foundPhotos = new Set();
        let selectedCount = 0;
        if (photosWithPositions.length > 0) {
            for (const photoData of photosWithPositions) {
                await this.jumpToScrollPosition(photoData.scrollPosition);
                await this.delay(300);
                const visiblePhotos = this.findVisiblePhotosByIds([photoData.id]);
                if (visiblePhotos.length > 0) {
                    const photoElement = visiblePhotos[0];
                    const success = await this.selectPhotoById(photoData.id, photoElement.element);
                    if (success) {
                        foundPhotos.add(photoData.id);
                        selectedCount++;
                    }
                } else {
                    console.warn(`❌ Photo ${photoData.id} not found at expected position ${photoData.scrollPosition}`);
                    photosWithoutPositions.push(photoData.id);
                }
                await this.delay(100);
            }
        }

        if (photosWithoutPositions.length > 0) {
            photosWithoutPositions.forEach(photoId => {
            });
            await this.retryMissingPhotos(photosWithoutPositions, foundPhotos);
            selectedCount = foundPhotos.size;
        }

        const notFound = photoIdsToSelect.filter(id => !foundPhotos.has(id));

        if (notFound.length > 0) {
            console.warn(` Photos that couldn't be selected:`, notFound);
            console.warn(`Tip: These photos may have been deleted, moved, or weren't properly scanned initially`);
        }
        const finalSelected = document.querySelectorAll('[role="checkbox"][aria-checked="true"]').length;
    }
    async jumpToScrollPosition(targetPosition) {
        const scrollContainer = this.findScrollableContainer();
        if (scrollContainer) {
            scrollContainer.scrollTop = targetPosition;
        } else {
            window.scrollTo(0, targetPosition);
        }
    }

    async retryMissingPhotos(photoIdsToSelect, foundPhotos) {
        if (photoIdsToSelect.length === 0) return;
        const scrollContainer = this.findScrollableContainer();
        const maxScroll = scrollContainer ?
            Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight) :
            Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;

        const retryPositions = [
            0,                    
            maxScroll * 0.5,    
            maxScroll * 0.8,    
            maxScroll            
        ];

        for (const position of retryPositions) {
            await this.jumpToScrollPosition(position);
            await this.delay(500); 
            const visiblePhotos = this.findVisiblePhotosByIds(photoIdsToSelect);
            for (const photoData of visiblePhotos) {
                if (!foundPhotos.has(photoData.id)) {
                    const success = await this.selectPhotoById(photoData.id, photoData.element);
                    if (success) {
                        foundPhotos.add(photoData.id);
                    }
                    await this.delay(100);
                }
            }
            const stillMissing = photoIdsToSelect.filter(id => !foundPhotos.has(id));
            if (stillMissing.length === 0) {
                break;
            }
        }

        const finalMissing = photoIdsToSelect.filter(id => !foundPhotos.has(id));
        if (finalMissing.length > 0) {
            console.warn(`Still couldn't find ${finalMissing.length} photos after retry:`, finalMissing);
        }
    }

    async scrollToTop() {
        const scrollContainer = this.findScrollableContainer();
        if (scrollContainer) {
            scrollContainer.scrollTop = 0;
            await this.delay(1000); 
        } else {
            window.scrollTo(0, 0);
            await this.delay(1000);
        }
    }

    findVisiblePhotosByIds(targetPhotoIds) {
        const visiblePhotos = [];
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
                console.warn(`No checkbox found for photo ${photoId}`);
                return false;
            }

            const isCurrentlySelected = checkbox.getAttribute('aria-checked') === 'true';

            if (isCurrentlySelected) {
                return true;
            }
            checkbox.click();

            await this.delay(100);
            const newState = checkbox.getAttribute('aria-checked') === 'true';

            if (newState) {
                return true;
            } else {
                console.warn(`Click didn't change state for photo ${photoId}`);
                return false;
            }

        } catch (error) {
            console.error(`Error selecting photo ${photoId}:`, error);
            return false;
        }
    }

    async scrollDownForMorePhotos() {
        const scrollContainer = this.findScrollableContainer();

        if (scrollContainer) {
            const beforeScroll = scrollContainer.scrollTop;
            const scrollAmount = Math.min(400, scrollContainer.clientHeight * 0.5);

            scrollContainer.scrollTop += scrollAmount;
            return scrollContainer.scrollTop;
        } else {
            const beforeScroll = window.pageYOffset;
            const scrollAmount = Math.min(400, window.innerHeight * 0.5);
            window.scrollBy(0, scrollAmount);
            return window.pageYOffset;
        }
    }

    async finalizeSelectionAndSync(overlay) {

        try {
            const selectedPhotos = overlay.find('.pc-image-item .will-delete-btn')
            const selectedPhotoIds = Array.from(selectedPhotos).map(checkbox => {
                const imageItem = checkbox.closest('.pc-image-item');
                return imageItem ? imageItem.getAttribute('data-photo-id') : 'unknown';
            });

            if (selectedPhotos.length === 0) {
                this.showCompletionMessage(overlay);
                return;
            }
            await this.synchronizeAllPhotoStates();
            const finalCount = this.countSelectedPhotosDetailed();
            this.showCompletionMessage(overlay);

        } catch (error) {
            console.error('Error during final sync:', error);
            doneBtn.innerHTML = 'Sync failed - try again';
            doneBtn.disabled = false;

            setTimeout(() => {
                doneBtn.innerHTML = originalText;
            }, 3000);
        }
    }

    async setPhotoState(googlePhotosElement, photoId, desiredState) {

        const checkbox = googlePhotosElement.querySelector('[role="checkbox"]');
        if (!checkbox) {
            console.warn(`⚠️ No checkbox found for photo ${photoId}`);
            return false;
        }

        const currentState = checkbox.getAttribute('aria-checked') === 'true';
        if (currentState === desiredState) {
            return true;
        }

        if (success) {
            const newState = checkbox.getAttribute('aria-checked') === 'true';
            if (newState === desiredState) {
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
        const linkElements = document.querySelectorAll('a[href*="photo/"]');

        for (const link of linkElements) {
            if (link.href.includes(photoId)) {
                const photoContainer = link.closest('.rtIMgb');
                if (photoContainer) {
                    return photoContainer;
                }
            }
        }
        const jslogElements = document.querySelectorAll('[jslog]');

        for (const element of jslogElements) {
            const jslogValue = element.getAttribute('jslog');
            if (jslogValue && jslogValue.includes(photoId)) {
                const photoContainer = element.closest('.rtIMgb');
                if (photoContainer) {
                    return photoContainer;
                }
            }
        }

        const allContainers = document.querySelectorAll('.rtIMgb');

        for (const container of allContainers) {
            const containerHTML = container.innerHTML;
            if (containerHTML.includes(photoId)) {
                return container;
            }
        }
        const partialId = photoId.substring(0, 20);

        for (const container of allContainers) {
            const containerHTML = container.innerHTML;
            if (containerHTML.includes(partialId)) {
                return container;
            }
        }

        console.warn(`🔍 Could not find DupeYak Duplicate Remover element for photo ${photoId}`);
        console.warn(`   Available photo containers on page: ${allContainers.length}`);
        console.warn(`   Available photo links on page: ${linkElements.length}`);

        return null;
    }

    async scrollToFindPhoto(photoId) {

        const scrollContainer = this.findScrollableContainer();
        if (scrollContainer) {
            const initialScrollTop = scrollContainer.scrollTop;
            const scrollAmount = Math.min(300, scrollContainer.clientHeight * 0.4); 
            const maxScrollAttempts = 3;

            for (let i = 0; i < maxScrollAttempts; i++) {
                scrollContainer.scrollTop += scrollAmount;
                await this.delay(300); 

                // Check if we found the photo
                const found = this.findGooglePhotosElement(photoId, null);
                if (found) {
                    return true;
                }
            }
            scrollContainer.scrollTop = initialScrollTop;
        }

        console.warn(` Could not find photo ${photoId} even after scrolling`);
        return false;
    }

    initializeCheckboxStates(overlay) {
        const imageItems = $(overlay).find('.pc-image-item');

        imageItems.each(function() {
            const photoId = item.attr('data-photo-id');
            const photoUrl = item.attr('data-photo-url');
            const checkboxIndicator = item.find('.pc-checkbox-indicator');

            const googlePhotosElement = this.findGooglePhotosElement(photoId, photoUrl);

            if (googlePhotosElement) {
                const checkbox = googlePhotosElement.find('[role="checkbox"]');
                if (checkbox.length) {
                    const isSelected = checkbox.attr('aria-checked') === 'true';
                }
            }
        });
    }
    showCompletionMessage(resultsOverlay) {
        const selectedCount = this.countSelectedPhotos();
        const completionOverlay = document.createElement('div');
        completionOverlay.id = 'pc-completion-overlay';
        const ideaIconUrl = chrome.runtime.getURL('../icons/idea.svg');
        const backIconUrl = chrome.runtime.getURL('../icons/back.svg');
        const deleteIconUrl = chrome.runtime.getURL('../icons/delete.svg');
          completionOverlay.innerHTML = `
            <div class="ap-popupu-in delete_popupu_img h-full flex items-center w-[510px] mx-auto relative">
             <div class="mx-auto px-3 max-[767px]:px-2">
                <div class="row">
                   <div class="bg-white max-[1600px]:rounded-[30px] rounded-[40px] border">
                    <div class="pb-0 p-5 flex items-center justify-between max-[1600px]:rounded-[30px] rounded-[40px] rounded-b-[0]">
                        <div class="headermenu ml-auto">
                            <div id="extension-version" class="version">
                                <a  id="pc-completion-close" class="g-close-btn font-semibold  w-[30px] h-[30px] rounded-full background-one flex justify-center items-center"><i class="fa-solid fa-xmark dec-color"></i></a>
                            </div>
                        </div>
                    </div>
                    <div class="p-5 flex flex-col pt-0">
                       <div class="flex flex-col gap-3">
                        <div class="articlecontent text-center">
                            <span class="flex w-[45px] items-center justify-center mx-auto mb-[10px]"><img class="delete-img" src="icons/delete.svg" alt="icon"></span>
                            <h2 class="font-bold dark-color text-center">Ready to Delete!</h2>
                            <p class="font16 mt-4 dec-color mb-7">You have selected <span class="font-bold color-one"><strong>${selectedCount} photo${selectedCount !== 1 ? 's' : ''}</strong> </span> for deletion.</p>
                            <p class="font16 mt-4 dec-color mb-7">When you’re ready, confirm the deletion to remove these duplicates permanently from your album.</p>
                           <div class="bg-gradient p-4 rounded-[15px] border-color-two border flex gap-3">
                                <span class="flex w-[25px] items-center justify-center"><img class="delete-img" src="icons/delete.svg" alt="icon"></span>
                                <p class="font16 dec-color text-left w-[90%]">Your selected photos are ready to be cleaned up.</p>
                            </div>
                            <div class=" background-three p-4 rounded-[15px] border-color-two border mt-3 flex gap-3">
                                <span class="flex w-[25px] items-center justify-center"><img class="idea-img" src="icons/idea.svg" alt="icon"></span>
                                <p class="font16 dec-color text-left w-[90%]"><span class="font-bold color-one">Want to search again?</span> Just reload the page to run another duplicate search.</p>
                            </div>
                            <div class="g-btn text-center mt-5">
                                <a  id="pc-completion-back" class="background-one !text-white py-[8px] px-[20px] inline-flex rounded-full font-medium gap-[3px] items-center"><span class="flex w-[10px] items-center justify-center"><img class="back-img" src="aaaaa" alt="icon"></span>Go back</a>
                                <a  id="pc-completion-done" class="bg-[#f00] !text-white py-[8px] px-[20px] inline-flex rounded-full font-medium  items-center">Got it!</a>
                            </div>
                        </div>
                       </div>
                    </div>
                   </div>
                </div>
            </div>
        </div>
             `;

        document.body.appendChild(completionOverlay);
        $(completionOverlay).find('.idea-img').attr('src', ideaIconUrl);
        $(completionOverlay).find('.back-img').attr('src', backIconUrl);
        $(completionOverlay).find('.delete-img').attr('src', deleteIconUrl);

        const closeBtn = document.getElementById('pc-completion-close');
        const doneBtn = document.getElementById('pc-completion-done');
        const backBtn = document.getElementById('pc-completion-back');

        const removeOverlay = () => {
            this.cleanupViewportObserver();

            completionOverlay.remove();
            resultsOverlay.remove();

            const statusPanel = document.getElementById('pc-floating-status');
            const findPanel = document.getElementById('photo-cleaner-panel');

            if (statusPanel) {
                statusPanel.style.display = 'none';
            }

            if (findPanel) {
                findPanel.style.display = 'none';
            }
        };

        const goBack = () => {
            completionOverlay.remove();
            resultsOverlay.style.display = 'block';
        };

        closeBtn.addEventListener('click', removeOverlay);
        doneBtn.addEventListener('click', removeOverlay);
        backBtn.addEventListener('click', goBack);
    }
    countSelectedPhotos() {
        let count = 0;
        const imageItems = document.querySelectorAll('#pc-results-overlay .pc-image-item');
        imageItems.forEach(item => {
              const deleteButton = item.querySelector('.will-delete-btn');
                if (deleteButton) {
                count++;
            }
        });
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

   imageItems.forEach(item => {
    const photoId = item.getAttribute('data-photo-id');
    const photoUrl = item.getAttribute('data-photo-url');
  const groupContainer = item.closest('.analysisresults-group');
   const checkbox = groupContainer.querySelector('input[type="checkbox"]');
    if (checkbox && checkbox.checked) {
        const overlaySelected = item.querySelectorAll('.will-delete-btn');

        if (overlaySelected.length > 0) {
            selectedInOverlay.push(photoId);
        }
    }
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
        const overlayButNotGoogle = selectedInOverlay.filter(id => !selectedInGoogle.includes(id));
        const googleButNotOverlay = selectedInGoogle.filter(id => !selectedInOverlay.includes(id));

        if (overlayButNotGoogle.length > 0) {
            console.warn(`Photos selected in overlay but NOT in DupeYak Duplicate Remover:`, overlayButNotGoogle);
        }
        if (googleButNotOverlay.length > 0) {
            console.warn(`Photos selected in DupeYak Duplicate Remover but NOT in overlay:`, googleButNotOverlay);
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
            warningElement.find('.pc-warning-icon').attr('src', warningIconUrl);
            $('body').append(warningElement);
        }
        warningElement.show();
    } else {
        warningElement.hide();
    }
}

    updateProgress(percent, text) {
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
        if (percent < 95) {
            displayPercent = percent;
        } else {
              displayPercent = ((percent - 95) * (100 / 13)).toFixed(0);
        }
        displayPercent = Math.round(displayPercent);
        const progressDone = textElement.querySelector('.progress-done');
       if (progressDone) {
            progressDone.style.width = displayPercent + '%';
            progressDone.setAttribute('data-done', displayPercent);
            progressDone.textContent = displayPercent + '%';
        }

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
            const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);

            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const blob = new Blob([bytes], { type: 'image/jpeg' });
            const blobUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `${filename}.jpg`;
            link.style.display = 'none';
            document.body.appendChild(link);
            this.debugShowImagePreview(blobUrl, filename);
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
            }, 30000);

            return blobUrl;
        } catch (error) {
            console.warn('Debug save failed:', error);
            return null;
        }
    }

    debugShowImagePreview(blobUrl, filename) {
        try {
            const img = new Image();
            img.onload = () => {
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
        document.getElementById('pc-resize-check').addEventListener('click', () => {
            message.remove();
            this.initializeFullPanel(); 
        });

        document.getElementById('pc-resize-close').addEventListener('click', () => {
            message.remove();
            this.addMinimalButton();
        });
        const resizeHandler = () => {
            const newCheck = this.checkViewportSize();
            if (newCheck.adequate) {
                message.remove();
                window.removeEventListener('resize', resizeHandler);
                this.initializeFullPanel();
            } else {
                const currentSizeEl = message.querySelector('.pc-size-current');
                if (currentSizeEl) {
                    currentSizeEl.innerHTML = `<strong>Current Size:</strong><br>${newCheck.currentWidth} × ${newCheck.currentHeight} pixels`;
                }
            }
        };

        window.addEventListener('resize', resizeHandler);
    }
    async startFullWorkflow() {
        if (this.isProcessing) return;
        const viewportCheck = this.checkViewportSize();
        if (!viewportCheck.adequate) {
            this.showViewportResizeMessage(viewportCheck);
            return;
        }

        try {
            const similarityInput = $('#pc-similarity');
            const similarityThreshold = parseInt(similarityInput.text()) || 75;
            this.similarityThreshold = similarityThreshold;

            this.isFullWorkflow = true;
            const scanResult = await this.startScanning();
            if (scanResult === 'NEW_WINDOW_OPENED') {
                return;
            }

            if (this.photos.length >= 2) {
                await this.analyzePhotos();
            } else if (this.photos.length === 1) {
                alert('Found only one photo. Need at least two photos for comparison.');
            } else {
                alert('No photos found. Please ensure you are viewing visible DupeYak Duplicate Remover items');
                const scanButtonEl = $('#pc-scan');
                if (scanButtonEl.length) {
                    $('.paush-img').remove();
                    scanButtonEl.find('.btn-label').text('🔍 Scan for Duplicates').parent().prop('disabled', false);
                }
            }
            this.isFullWorkflow = false;
            this.isProcessing = false;

            const scanButtonEl = $('#pc-scan');
            if (scanButtonEl.length) {
                scanBtn.find('.btn-label').text('🔍 Scan for Duplicates').parent().prop('disabled', false);
            }
        } catch (error) {
            console.error('🚫 An error occurred during workflow execution:', error);

            this.isFullWorkflow = false;
            this.isProcessing = false;
            this.isScanning = false;
            this.showWindowWarning(false); 

            const scanButtonEl = $('#pc-scan');
            if (scanButtonEl.length) {
                scanBtn.find('.btn-label').text('🔍 Scan for Duplicates').parent().prop('disabled', false);
            }

            alert('Error during scanning/analysis: ' + error.message);
        }
    }
    async getOriginalImageSize(photo) {
        try {
            // Check cache first using photo ID
            if (this.imageSizeCache && this.imageSizeCache[photo.id]) {
                const cachedInfo = this.imageSizeCache[photo.id];
                if (typeof cachedInfo === 'string') {
                    if (this.imageSizeLoaders && this.imageSizeLoaders.has(photo.id)) {
                        return { formatted: cachedInfo, bytes: 0, takesUpSpace: null, spaceTaken: null, isOriginalQuality: null };
                    }
                } else {
                    return cachedInfo;
                }
            }
            const mediaKey = await this.extractMediaKeyFromPhoto(photo);
            if (!mediaKey) {
                console.warn(`⚠️ Could not extract media key for photo ${photo.id}`);
                return null;
            }

            const [extendedInfo, batchInfo] = await Promise.all([
                this.getItemInfoExt(mediaKey),
                this.getBatchMediaInfo([mediaKey])
            ]);
            if (extendedInfo && extendedInfo.size) {
                const sizeFormatted = this.formatFileSize(extendedInfo.size);
                const sizeInfo = {
                    formatted: sizeFormatted,
                    bytes: extendedInfo.size,
                    resWidth: extendedInfo.resWidth,
                    resHeight: extendedInfo.resHeight,
                    takesUpSpace: extendedInfo.takesUpSpace,
                    spaceTaken: extendedInfo.spaceTaken,
                    isOriginalQuality: extendedInfo.isOriginalQuality,
                    timestamp: extendedInfo.timestamp,              
                    uploadTimestamp: batchInfo?.[0]?.creationTimestamp || null, 
                    timezoneOffset: extendedInfo.timezoneOffset,
                    fileName: extendedInfo.fileName,
                    cameraInfo: extendedInfo.cameraInfo,
                    source: extendedInfo.source,
                    geoLocation: extendedInfo.geoLocation
                };

                if (!this.imageSizeCache) this.imageSizeCache = {};
                this.imageSizeCache[photo.id] = sizeInfo;
                const uploadStatus = sizeInfo.uploadTimestamp ?
                    `upload: ${sizeInfo.uploadTimestamp}` : 'upload: not available';
                return sizeInfo;
            } else {
                console.warn(`No complete data in API responses for photo ${photo.id}:`, { extendedInfo, batchInfo });
            }

            return null;
        } catch (error) {
            console.warn(`Failed to get image size for photo ${photo.id}:`, error);
            return null;
        }
    }

    async extractMediaKeyFromPhoto(photo) {
        try {
            if (photo.id && photo.id.length > 20) {
                return photo.id;
            }
            const photoElements = document.querySelectorAll('[data-id], [jsdata], [data-ved]');

            for (const element of photoElements) {
                const elementId = element.getAttribute('data-id');
                if (elementId === photo.id) {
                    const mediaKey = element.getAttribute('data-media-key') ||
                        element.getAttribute('data-itemkey') ||
                        element.getAttribute('data-item-key') ||
                        element.getAttribute('jsdata') ||
                        element.getAttribute('data-ved');

                    if (mediaKey && mediaKey.length > 10) {
                        return mediaKey;
                    }
                }
            }
            const urlKey = await this.extractMediaKeyFromUrl(photo.url);
            if (urlKey) {
                return urlKey;
            }
            const bgKey = await this.extractMediaKeyFromBackgroundImage(photo.url);
            if (bgKey) {
                return bgKey;
            }
            const alternativeKey = await this.tryAlternativeMediaKeyFormats(photo);
            if (alternativeKey) {
                return alternativeKey;
            }

            console.warn(`Could not find media key for photo ${photo.id}`);
            return null;
        } catch (error) {
            console.warn(`Error extracting media key for photo ${photo.id}:`, error);
            return null;
        }
    }

    async extractMediaKeyFromUrl(imageUrl) {
        try {
            const urlMatch = imageUrl.match(/\/([A-Za-z0-9_-]{20,})=w\d+-h\d+/);
            if (urlMatch && urlMatch[1]) {
                return urlMatch[1];
            }
            const altMatch = imageUrl.match(/\/([A-Za-z0-9_-]{20,})\?/);
            if (altMatch && altMatch[1]) {
                return altMatch[1];
            }
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
            const elements = document.querySelectorAll('*');
            for (const element of elements) {
                const bgImage = window.getComputedStyle(element).backgroundImage;
                if (bgImage && bgImage.includes(imageUrl.substring(0, 50))) {
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
            let cleanId = photo.id.replace(/^(photo|img|item)[-_]?/i, '');
            cleanId = cleanId.replace(/[-_]?(thumb|preview)$/i, '');

            if (cleanId !== photo.id && cleanId.length > 15) {
                return cleanId;
            }
            const pageHtml = document.documentElement.outerHTML;
            const idPattern = new RegExp(`["']([A-Za-z0-9_-]{20,})["'][^"']*${photo.id.substring(0, 10)}`, 'g');
            const matches = pageHtml.match(idPattern);

            if (matches && matches.length > 0) {
                const match = matches[0].match(/["']([A-Za-z0-9_-]{20,})["']/);
                if (match && match[1]) {
                    return match[1];
                }
            }
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
            const authData = await this.getGooglePhotosAuthData();
            if (!authData) {
                throw new Error('Could not extract DupeYak Duplicate Remover authentication data');
            }
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
            return this.parseItemInfoExt(rawResponse);

        } catch (error) {
            console.error('❌ Error getting item info ext:', error);
            throw error;
        }
    }

    async getBatchMediaInfo(mediaKeyArray) {
        try {
            const authData = await this.getGooglePhotosAuthData();
            if (!authData) {
                throw new Error('Could not extract DupeYak Duplicate Remover authentication data');
            }
            const rpcid = 'EWgK9e';
            const formattedMediaKeys = mediaKeyArray.map(key => [key]);
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
            return this.parseBulkMediaInfo(rawResponse);

        } catch (error) {
            console.error('❌ Error getting batch media info:', error);
            throw error;
        }
    }

    async getGooglePhotosAuthData() {
        try {
            if (this.authDataCache) {
                return this.authDataCache;
            }
            const authData = await this.extractAuthFromDomScripts();
            if (authData) {
                this.authDataCache = authData; 
                return authData;
            }
            const networkAuthData = await this.extractAuthFromNetworkRequests();
            if (networkAuthData) {
                this.authDataCache = networkAuthData; 
                return networkAuthData;
            }
            const fallbackAuthData = await this.extractAuthDataFallback();
            if (fallbackAuthData) {
                this.authDataCache = fallbackAuthData; 
                return fallbackAuthData;
            }

            console.warn('Could not extract DupeYak Duplicate Remover authentication data');
            return null;

        } catch (error) {
            console.warn('Failed to extract DupeYak Duplicate Remover auth data:', error);
            return null;
        }
    }

    async extractAuthFromDomScripts() {
        try {
            const scripts = document.querySelectorAll('script');

            for (const script of scripts) {
                if (script.textContent) {
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
                            rapt: null, 
                            account: null 
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
            return new Promise((resolve) => {
                let authData = null;
                const originalFetch = window.fetch;
                const interceptor = async function (...args) {
                    const result = await originalFetch.apply(this, args);
                    if (args[0] && args[0].includes && args[0].includes('batchexecute')) {
                        try {
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

                window.fetch = interceptor;

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
            const metaElements = document.querySelectorAll('meta[name*="csrf"], meta[name*="token"], meta[content*="token"]');

            for (const meta of metaElements) {
                const content = meta.getAttribute('content');
                if (content && content.length > 10) {
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
            const mediaInfo = data[0][1][0];
            const mediaKey = mediaInfo[0]; 
            const infoArray = mediaInfo[1]; 

            const fileName = infoArray[3]; 
            const size = infoArray[9]; 

            const storageInfo = infoArray?.at(-1); 
            const takesUpSpace = storageInfo?.[0] === undefined ? null : storageInfo[0] === 1;
            const spaceTaken = storageInfo?.[1];
            const isOriginalQuality = storageInfo?.[2] === undefined ? null : storageInfo[2] === 2;

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
            const photoTakenTimestamp = itemData?.[3]; 
            return {
                mediaKey: itemData?.[0],
                dedupKey: itemData?.[11],
                descriptionFull: itemData?.[1],
                fileName: itemData?.[2],
                timestamp: photoTakenTimestamp,           
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
            const timestampMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;

            let date = new Date(timestampMs);
            if (timezoneOffset !== undefined && timezoneOffset !== null) {
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
        this.authDataCache = null;
    }

    async loadImageSizes(overlay) {
        this.cleanupViewportObserver();
        this.setupViewportObserver(overlay);
    }

    setupViewportObserver(overlay) {
        const imageItems = overlay[0].querySelectorAll('.pc-image-item');

        if (imageItems.length === 0) {
            return;
        }
        this.viewportObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const imageItem = entry.target;
                const photoId = imageItem.getAttribute('data-photo-id');
                const imageSizeElement = imageItem.querySelector('.pc-image-size');

                if (entry.isIntersecting) {
                    this.startViewportTimer(imageSizeElement, photoId);
                } else {
                    this.cancelViewportTimer(photoId);
                }
            });
        }, {
            root: null, 
            rootMargin: '50px', 
            threshold: 0.1 
        });

        imageItems.forEach(imageItem => {
            this.viewportObserver.observe(imageItem);
        });

    }

    startViewportTimer(element, photoId) {
        this.cancelViewportTimer(photoId);

        if (!element) {
            console.warn(`⚠️ No image size element found for photo ${photoId}`);
            return;
        }
        const currentContent = element.innerHTML?.trim();
        if (currentContent &&
            (currentContent.includes('color: #666') || currentContent.includes('pc-size-info')) &&
            !currentContent.includes('Loading...')) {
            return;
        }

        if (this.imageSizeCache && this.imageSizeCache[photoId]) {
            const sizeInfo = this.imageSizeCache[photoId];
            this.displaySizeInfo(element, sizeInfo);
            return;
        }

        element.textContent = 'Loading...';
        element.style.color = '#999';
        element.style.fontSize = '0.8em';
        element.style.fontStyle = 'italic';

        const timer = setTimeout(async () => {
            await this.loadImageSizeForElement(element, photoId);
        }, 500);

        this.viewportTimers.set(photoId, timer);
    }

    cancelViewportTimer(photoId) {
        const timer = this.viewportTimers.get(photoId);
        if (timer) {
            clearTimeout(timer);
            this.viewportTimers.delete(photoId);
        }
    }

    async loadImageSizeForElement(element, photoId) {
        const currentContent = element.innerHTML?.trim();
        if (currentContent &&
            (currentContent.includes('color: #666') || currentContent.includes('pc-size-info')) &&
            !currentContent.includes('Loading...')) {
            return;
        }

        if (this.imageSizeCache && this.imageSizeCache[photoId]) {
            const sizeInfo = this.imageSizeCache[photoId];
            this.displaySizeInfo(element, sizeInfo);
            return;
        }

        if (this.imageSizeLoaders.has(photoId)) {
            return;
        }

        this.imageSizeLoaders.set(photoId, true);

        try {
            let mediaItem = this.photos.find(p => p.id === photoId);
            let mediaType = 'photo';

            if (!mediaItem) {
                mediaItem = this.videos.find(v => v.id === photoId);
                mediaType = 'video';
            }

            if (!mediaItem) {
                console.warn(` Media item ${photoId} not found in photos or videos array`);
                element.textContent = '';
                return;
            }
            const sizeInfo = await this.getOriginalImageSize(mediaItem);

            if (sizeInfo) {
                this.displaySizeInfo(element, sizeInfo);
            } else {
                element.innerHTML = '';
                element.style.fontStyle = 'normal';
            }
        } catch (error) {
            console.warn(`❌ Error loading size for photo ${photoId}:`, error);
            element.innerHTML = '';
            element.style.fontStyle = 'normal';
        } finally {
            this.imageSizeLoaders.delete(photoId);
        }
    }

    displaySizeInfo(element, sizeInfo) {
        const imageItem = element.closest('.pc-image-item');
        const photoLabel = imageItem?.querySelector('p');
        if (typeof sizeInfo === 'string') {
            element.innerHTML = `<div class="pc-size-info" style="color: #666; font-size: 0.9em; margin: 0; padding: 0;">(${sizeInfo})</div>`;
            return;
        }
        let html = '';
        if (sizeInfo.resWidth && sizeInfo.resHeight && sizeInfo.timestamp) {
            const resolution = `${sizeInfo.resWidth}x${sizeInfo.resHeight}`;
            const fullDateTime = this.formatDateTime(sizeInfo.timestamp, sizeInfo.timezoneOffset);
            const takenDateTime = fullDateTime.split(" ")[0];

            html += `<span><span class="img-size text-[12px] bg-gradient rounded-[5px] px-[8px] py-[2px] border border-[#e2e8f0] dark-color mx-[1px]">${resolution}</span> <span class="text-[12px] bg-gradient rounded-[5px] px-[8px] py-[2px] border border-[#e2e8f0] dark-color mx-[1px]">${takenDateTime}</span></span>`;
        }
        let storageText = `(${sizeInfo.formatted}) `;
        let storageColor = '#666';
        if (sizeInfo.takesUpSpace === false) {
            storageText += `not taking space`;
            storageColor = '#28a745';
        } else if (sizeInfo.takesUpSpace === true && sizeInfo.spaceTaken) {
            const spaceTakenFormatted = this.formatFileSize(sizeInfo.spaceTaken);
            storageText += `takes ${spaceTakenFormatted}`;
            storageColor = '#ff6b35';
        }

        html += `<div class="pc-size-info" style="color: ${storageColor}; font-size: 0.9em; margin: 0; padding: 0; text-align: center;">${storageText}</div>`;
        if (photoLabel) {
            photoLabel.innerHTML = '';
            photoLabel.style.display = 'none'; 
        }

        element.innerHTML = html;
        element.style.fontStyle = 'normal';
    }

    cleanupViewportObserver() {
        // Clean up existing observer
        if (this.viewportObserver) {
            this.viewportObserver.disconnect();
            this.viewportObserver = null;
        }

        // Clear all timers
        this.viewportTimers.forEach((timer, photoId) => {
            clearTimeout(timer);
        });
        this.viewportTimers.clear();

        // Clear loading set
        this.imageSizeLoaders.clear();
    }

    convertToFullResolution(thumbnailUrl) {
        try {
            const baseUrlMatch = thumbnailUrl.match(/^(.+)=w\d+-h\d+(-[^?]+)?(\?.*)?$/);
            if (baseUrlMatch) {
                const baseUrl = baseUrlMatch[1];
                const suffix = baseUrlMatch[2] || '-no'; 
                const queryParams = baseUrlMatch[3] || '';
                const fullResUrl = `${baseUrl}=w1200-h1200${suffix}${queryParams}`;
                return fullResUrl;
            }
            console.warn('Could not convert URL to full resolution, using original:', thumbnailUrl.substring(0, 100));
            return thumbnailUrl;

        } catch (error) {
            console.error('Error converting to full resolution:', error);
            return thumbnailUrl;
        }
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'purchaseCompleted') {
        if (window.photoCleanerInstance) {
        }
        sendResponse({ success: true });
    }

    else if (message.action === 'debugStatus') {
        if (window.photoCleanerInstance) {
            sendResponse({
                success: true,
                isPaidVersion: window.photoCleanerInstance.isPaidVersion,
                todaySimilarGroupsShown: window.photoCleanerInstance.todaySimilarGroupsShown,
                dailySimilarGroupsLimit: window.photoCleanerInstance.dailySimilarGroupsLimit,
                todayReAnalysisCount: window.photoCleanerInstance.todayReAnalysisCount,
                dailyReAnalysisLimit: window.photoCleanerInstance.dailyReAnalysisLimit,
            });
        } else {
            sendResponse({ success: false, error: 'Extension not initialized' });
        }
    }
    else if (message.action === 'setProStatus') {
        if (window.photoCleanerInstance) {
            sendResponse({ success: true, message: 'Pro status set' });
        } else {
            sendResponse({ success: false, error: 'Extension not initialized' });
        }
    }
    return true;
});

function initializeExtension() {
    const currentUrl = window.location.href;
    const isGooglePhotos = currentUrl.includes('photos.google.com/');
    const isValidPage = isValidGooglePhotosPage(currentUrl);

    if (!isGooglePhotos) {
        return;
    }
    cleanupExistingExtension();

    if (isValidPage) {
        window.photoCleanerInstance = new PhotoExtractor();

        window.pcDebug = {
            instance: () => window.photoCleanerInstance
        };
    } else {
        showInfoMessage();
    }
}
function cleanupExistingExtension() {
    if (window.photoCleanerInstance) {
        if (typeof window.photoCleanerInstance.closePanel === 'function') {
            window.photoCleanerInstance.closePanel();
        }
        window.photoCleanerInstance = null;
    }
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
function showInfoMessage() {
    if ($('#pc-info-message').length) {
        return;
    }

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
    infoMessage.find('.pc-info-close').on('click', function () {
        infoMessage.remove();
        window.infoMessageDismissed = true;
    });
    $('body').append(infoMessage);
}

$(document).ready(function () {
    initializeExtension();
});
let lastUrl = location.href;
function setupUrlChangeDetection() {
    const observer = new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            handleUrlChange();
        }
    });

    observer.observe(document, { subtree: true, childList: true });
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
        originalPushState.apply(history, args);
        setTimeout(() => {
            const url = location.href;
            if (url !== lastUrl) {
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
                lastUrl = url;
                handleUrlChange();
            }
        }, 100);
    };
    window.addEventListener('popstate', () => {
        setTimeout(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                handleUrlChange();
            }
        }, 100);
    });
}

function handleUrlChange() {
    clearTimeout(window.urlChangeTimer);
    window.urlChangeTimer = setTimeout(() => {
        initializeExtension();
    }, 500); 
}

setupUrlChangeDetection();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTempElementInfo') {
        const extractor = window.photoCleanerInstance;
        if (extractor) {
            const elementInfo = extractor.getTempElementInfo(request.elementId);
            sendResponse(elementInfo);
        } else {
            sendResponse(null);
        }
        return true; 
    }
});

async function getUserData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['userEmail', 'userId'], (result) => {
            resolve(result);
        });
    });
}

window.addEventListener('load', () => {
    setTimeout(async () => {
        if (typeof window.phash !== 'undefined' && typeof window.ahash !== 'undefined') {
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
                        const testHash = await window.phash(img, 8);
                    } catch (error) {
                        console.error('❌ Hash computation test failed:', error);
                    }
                };
                img.src = canvas.toDataURL();
            } catch (error) {
                console.error('❌ Failed to create test image:', error);
            }
        } else {
        }
    }, 2000);
});
