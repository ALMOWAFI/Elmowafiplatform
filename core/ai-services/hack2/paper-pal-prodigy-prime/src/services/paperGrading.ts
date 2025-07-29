
// Integration with the Enhanced Math Feedback System using our Python backend
import { mathAnalysisApi } from './mathAnalysisApi';

export interface GradingResult {
  grade: string;
  score: number;
  feedback: string;
  markings: Array<{
    id: number;
    x: number;
    y: number;
    type: 'error' | 'correct' | 'partial';
    message: string;
    text?: string;
    detailed_feedback?: string;
  }>;
  details?: Array<{
    id: string;
    type: string;
    text: string;
    is_correct: boolean;
    feedback: string;
    hints: string[];
  }>;
  worksheet_url?: string;
}

// Real implementation of the math paper grading process
export const gradeMathPaper = async (image: File): Promise<GradingResult> => {
  try {
    // 1. Upload the image to our enhanced math analyzer
    const jobId = await mathAnalysisApi.uploadForAnalysis(image);
    
    // 2. Wait for the analysis to complete
    return new Promise((resolve, reject) => {
      // This is handled via polling in the UI component now, 
      // since we're using the simulateGradingProgress function for UI feedback
      // We'll just check once and resolve when complete
      const checkInterval = setInterval(async () => {
        try {
          const status = await mathAnalysisApi.checkJobStatus(jobId);
          
          if (status.status === 'complete' && status.results) {
            clearInterval(checkInterval);
            // 3. Convert the results to our expected format
            const gradingResult = mathAnalysisApi.convertToGradingFormat(status.results);
            resolve(gradingResult);
          } else if (status.status === 'error') {
            clearInterval(checkInterval);
            reject(new Error(status.message));
          }
          // Otherwise keep waiting
        } catch (error) {
          clearInterval(checkInterval);
          reject(error);
        }
      }, 1000); // Check every second
      
      // Set a timeout to prevent infinite polling
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Analysis timeout after 60 seconds'));
      }, 60000);
    });
  } catch (error) {
    console.error('Error in math paper grading:', error);
    throw error;
  }
};

// Update progress using real API status
export const simulateGradingProgress = (
  callback: (progress: number, stage: 'analyzing' | 'checking' | 'marking' | 'finalizing') => void
): () => void => {
  // We'll still start with the simulation for immediate user feedback,
  // but we'll update with actual progress when a job ID is available
  let jobId: string | null = null;
  let useRealProgress = false;
  
  // Start with simulated progress for better UX
  let progress = 0;
  const interval = setInterval(() => {
    if (useRealProgress) {
      // Don't update progress here if we're using real progress
      return;
    }
    
    progress += 2;
    
    let stage: 'analyzing' | 'checking' | 'marking' | 'finalizing';
    if (progress < 30) {
      stage = 'analyzing';
    } else if (progress < 60) {
      stage = 'checking';
    } else if (progress < 85) {
      stage = 'marking';
    } else {
      stage = 'finalizing';
    }
    
    callback(progress, stage);
    
    if (progress >= 100) {
      clearInterval(interval);
    }
  }, 250); // Slower to give API time to respond
  
  // Function to set the job ID once available
  const setJobId = (id: string) => {
    jobId = id;
    useRealProgress = true;
    
    // Start polling for real progress
    const realStatusInterval = setInterval(async () => {
      if (!jobId) {
        clearInterval(realStatusInterval);
        return;
      }
      
      try {
        const status = await mathAnalysisApi.checkJobStatus(jobId);
        
        let stage: 'analyzing' | 'checking' | 'marking' | 'finalizing';
        if (status.progress < 30) {
          stage = 'analyzing';
        } else if (status.progress < 60) {
          stage = 'checking';
        } else if (status.progress < 85) {
          stage = 'marking';
        } else {
          stage = 'finalizing';
        }
        
        callback(status.progress, stage);
        
        if (status.status === 'complete' || status.status === 'error') {
          clearInterval(realStatusInterval);
        }
      } catch (error) {
        console.error('Error fetching job status:', error);
      }
    }, 1000); // Check every second
    
    // Update the clean-up function to clear both intervals
    const originalCleanup = cleanup;
    cleanup = () => {
      originalCleanup();
      clearInterval(realStatusInterval);
    };
  };
  
  // Function to clean up intervals
  let cleanup = () => clearInterval(interval);
  
  // Return both the cleanup function and the setJobId function
  return Object.assign(cleanup, { setJobId });
};
