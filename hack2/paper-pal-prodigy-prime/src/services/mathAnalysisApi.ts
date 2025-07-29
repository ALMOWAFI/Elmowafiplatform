// Integration with the Enhanced Math Feedback System

import axios from 'axios';

// Define equation marker interface
export interface EquationMarker {
  id: string;
  bbox: number[];  // [x, y, width, height]
  bbox_normalized?: number[];  // [x_percent, y_percent, width_percent, height_percent]
  is_correct: boolean;
  text: string;
}

// Define the API response interface
export interface MathAnalysisResult {
  image_path: string;
  summary: {
    total_problems: number;
    correct_problems: number;
    incorrect_problems: number;
    score_percentage: number;
    recommendations: string[];
  };
  equation_markers: Array<EquationMarker>;
  problem_details: Array<{
    id: string;
    type: string;
    text: string;
    is_correct: boolean;
    feedback: string;
    hints: string[];
  }>;
  worksheet_path: string;
  job_id: string;
}

// Define the API client - use relative URLs since we're proxying through Vite
const API_BASE_URL = ''; // Empty base URL for proxy through Vite

export const mathAnalysisApi = {
  // Upload a math paper for analysis
  uploadForAnalysis: async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data?.success && response.data?.job_id) {
        return response.data.job_id;
      } else {
        throw new Error('Failed to start analysis job');
      }
    } catch (error) {
      console.error('Error uploading for analysis:', error);
      throw error;
    }
  },
  
  // Check the status of an analysis job
  checkJobStatus: async (jobId: string): Promise<{
    status: string;
    progress: number;
    message: string;
    results?: MathAnalysisResult;
  }> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/job_status/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Error checking job status:', error);
      throw error;
    }
  },
  
  // Poll for job completion
  pollUntilComplete: (jobId: string, 
                      onProgress: (progress: number, message: string) => void,
                      onComplete: (results: MathAnalysisResult) => void,
                      onError: (error: string) => void) => {
    const intervalId = setInterval(async () => {
      try {
        const status = await mathAnalysisApi.checkJobStatus(jobId);
        onProgress(status.progress, status.message);
        
        if (status.status === 'complete' && status.results) {
          clearInterval(intervalId);
          onComplete(status.results);
        } else if (status.status === 'error') {
          clearInterval(intervalId);
          onError(status.message);
        }
      } catch (error) {
        clearInterval(intervalId);
        onError('Error checking job status');
      }
    }, 1000);
    
    // Return a function to cancel polling
    return () => clearInterval(intervalId);
  },
  
  // Convert the enhanced math result to the expected GradingResult format for compatibility
  convertToGradingFormat: (mathResult: MathAnalysisResult): any => {
    // If we have no equation markers, generate some dummy ones to avoid errors
    if (!mathResult.equation_markers || mathResult.equation_markers.length === 0) {
      console.warn('No equation markers found in result, generating dummy markers');
      
      // Generate some dummy markings based on problem details
      const dummyMarkings = (mathResult.problem_details || []).map((problem, index) => {
        return {
          id: index + 1,
          x: 20 + (index * 20) % 60, // Distribute across the image
          y: 30 + (index * 15) % 40,
          type: problem.is_correct ? 'correct' : 'error',
          message: problem.text,
          text: problem.text,
          detailed_feedback: problem.feedback
        };
      });
      
      // If we still have no markings, create at least one
      if (dummyMarkings.length === 0) {
        dummyMarkings.push({
          id: 1,
          x: 50,
          y: 50,
          type: 'correct',
          message: 'No specific errors detected',
          text: '',
          detailed_feedback: ''
        });
      }
      
      return {
        grade: 'A',
        score: mathResult.summary?.score_percentage || 100,
        feedback: mathResult.summary?.recommendations?.join(' ') || 'Good work!',
        markings: dummyMarkings,
        details: mathResult.problem_details || [],
        worksheet_url: mathResult.worksheet_path
      };
    }
    
    // Process equation markers if available
    const markings = mathResult.equation_markers.map((marker, index) => {
      // Normalize position as percentage (0-100)
      let x = 50;
      let y = 50;
      
      // Use precision-localized coordinates if available
      if (marker.bbox_normalized && marker.bbox_normalized.length === 4) {
        // Use the pre-normalized coordinates (already in percentages)
        x = marker.bbox_normalized[0] + (marker.bbox_normalized[2] / 2); // center X position
        y = marker.bbox_normalized[1] + (marker.bbox_normalized[3] / 2); // center Y position
      } else if (marker.bbox && marker.bbox.length === 4) {
        // Fallback to calculating from raw bbox if normalized isn't available
        x = Math.min(Math.max((marker.bbox[0] + marker.bbox[2] / 2) * 100, 5), 95);
        y = Math.min(Math.max((marker.bbox[1] + marker.bbox[3] / 2) * 100, 5), 95);
      }
      
      return {
        id: index + 1,
        x: x,
        y: y,
        type: marker.is_correct ? 'correct' : 'error',
        message: marker.is_correct ? 'Correct!' : 'Check this solution',
        text: marker.text,
        // Include the detailed feedback if available
        detailed_feedback: mathResult.problem_details.find(p => p.id === marker.id)?.feedback || ''
      };
    });
    
    // Generate overall feedback from the recommendations
    const feedback = mathResult.summary.recommendations.join(' ') + 
                    ` Overall score: ${mathResult.summary.score_percentage}%.`;
    
    // Calculate grade based on percentage
    let grade = 'F';
    const percentage = mathResult.summary.score_percentage;
    if (percentage >= 97) grade = 'A+';
    else if (percentage >= 93) grade = 'A';
    else if (percentage >= 90) grade = 'A-';
    else if (percentage >= 87) grade = 'B+';
    else if (percentage >= 83) grade = 'B';
    else if (percentage >= 80) grade = 'B-';
    else if (percentage >= 77) grade = 'C+';
    else if (percentage >= 73) grade = 'C';
    else if (percentage >= 70) grade = 'C-';
    else if (percentage >= 67) grade = 'D+';
    else if (percentage >= 63) grade = 'D';
    else if (percentage >= 60) grade = 'D-';
    
    return {
      grade: grade,
      score: percentage,
      feedback: feedback,
      markings: markings,
      details: mathResult.problem_details,
      worksheet_url: mathResult.worksheet_path
    };
  }
};
