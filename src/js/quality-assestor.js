// import * as faceapi from 'face-api.js';

export class QualityAssessor {
//   constructor() {
//     this.cv = window.cv;
//     this.faceapiInitialized = false;
//   }

//   async initializeFaceApi() {
//     if (this.faceapiInitialized) return;

//     try {
//       console.log('Loading Tiny Face Detector and Face Landmarks models from /models...');

//       await Promise.all([
//         faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
//         faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models')
//       ]);

//       this.faceapiInitialized = true;
//       console.log('✅ Tiny Face Detector and Face Landmarks models loaded successfully!');
//     } catch (error) {
//       console.error('❌ Failed to load face-api.js models:', error);
//       console.error('Error details:', error instanceof Error ? error.message : String(error));

//       this.faceapiInitialized = false;
//     }
//   }

  async assessImageQuality(imageFile, processingSize = 300) {
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

  analyzeTechnicalQuality(imageFile, processingSize = 300) {
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
        objectUrl = URL.createObjectURL(imageFile);
        img.src = objectUrl;
      } catch (error) {
        reject(new Error(`Failed to create object URL for file: ${imageFile.name}`));
      }
    });
  }

  async analyzeFaceQuality(imageFile) {
    if (!this.faceapiInitialized) {
      console.log('Face-api.js not initialized, skipping face detection');
      return undefined;
    }

    try {
      const img = await this.loadImageElement(imageFile);

      console.log('Running Tiny Face Detector with facial landmarks...');
      let detectionsWithLandmarks = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({
        scoreThreshold: 0.2,
        inputSize: 416
      })).withFaceLandmarks(true);

      if (detectionsWithLandmarks.length === 0) {
        console.log('No faces with default settings, trying more sensitive detection...');
        detectionsWithLandmarks = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({
          scoreThreshold: 0.1,
          inputSize: 320
        })).withFaceLandmarks(true);
      }

      if (detectionsWithLandmarks.length === 0) {
        console.log('Still no faces, trying largest input size...');
        detectionsWithLandmarks = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({
          scoreThreshold: 0.1,
          inputSize: 512
        })).withFaceLandmarks(true);
      }

      if (detectionsWithLandmarks.length === 0) {
        console.log('No faces detected by Tiny Face Detector');
        return undefined;
      }

      console.log(`✅ Detected ${detectionsWithLandmarks.length} face(s) with landmarks using Tiny Face Detector!`);

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
        objectUrl = URL.createObjectURL(imageFile);
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

    console.log('Eye contact analysis:', {
      leftEyeOpenness: leftEyeOpenness.toFixed(3),
      rightEyeOpenness: rightEyeOpenness.toFixed(3),
      eyeSymmetry: eyeSymmetry.toFixed(3),
      finalScore: Math.min(100, eyeContactScore).toFixed(2)
    });

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

  // Base technical quality weights
  const baseWeights = {
    blur: 0.20,      // Reduced from 25% to 20%
    sharpness: 0.15, // Reduced from 20% to 15%
    exposure: 0.15,
    contrast: 0.12,
    noise: 0.08,
    colorBalance: 0.05
  };

  // Apply base technical scores (85% total weight)
  score += technical.blurScore * baseWeights.blur;
  score += technical.sharpnessScore * baseWeights.sharpness;
  score += technical.exposureQuality * baseWeights.exposure;
  score += technical.contrastScore * baseWeights.contrast;
  score += technical.noiseLevel * baseWeights.noise;
  score += technical.colorBalance * baseWeights.colorBalance;

  // Face quality bonus (27% weight if faces present)
  if (faces && faces.faceCount > 0) {
    const faceBonus = (
      faces.faceCentering * 0.05 +
      faces.faceSize * 0.04 +
      faces.lightingQuality * 0.03 +
      faces.portraitScore * 0.02 +
      faces.eyeContactScore * 0.13
    );
    score += faceBonus;

    console.log('Face quality detected:', {
      faceCount: faces.faceCount,
      faceCentering: faces.faceCentering.toFixed(2),
      faceSize: faces.faceSize.toFixed(2),
      lightingQuality: faces.lightingQuality.toFixed(2),
      faceBonus: faceBonus.toFixed(4)
    });
  }

  return Math.max(0, Math.min(100, score));
}
getQualityTier(score) {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}


}
