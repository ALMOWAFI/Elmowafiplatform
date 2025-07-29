
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import TeacherHeader from "@/components/TeacherHeader";
import UploadForm from "@/components/UploadForm";
import GradedPaper from "@/components/GradedPaper";
import ProcessingIndicator from "@/components/ProcessingIndicator";
import { gradeMathPaper, simulateGradingProgress, GradingResult } from "@/services/paperGrading";
import { mathAnalysisApi } from "@/services/mathAnalysisApi";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<'analyzing' | 'checking' | 'marking' | 'finalizing'>('analyzing');
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const { toast } = useToast();

  const handleImageUpload = async (file: File) => {
    try {
      // Create URL for the uploaded image
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);
      setIsProcessing(true);
      
      // 1. Upload the file to our enhanced math system
      const jobId = await mathAnalysisApi.uploadForAnalysis(file);
      
      // 2. Start the progress tracking with real-time updates
      const progressTracker = simulateGradingProgress((progress, stage) => {
        setProgress(progress);
        setProcessingStage(stage);
      });
      
      // Add the job ID to enable real progress tracking
      if (typeof (progressTracker as any).setJobId === 'function') {
        (progressTracker as any).setJobId(jobId);
      }
      
      // 3. Process the image with our enhanced math grading service
      const result = await gradeMathPaper(file);
      
      // 4. Update the state with the grading results
      setGradingResult(result);
      setIsProcessing(false);
      
      // 5. Stop the progress tracking
      progressTracker();
      
      // 6. Show success notification
      toast({
        title: "Grading Complete!",
        description: `Your math paper has been graded with a ${result.grade}`,
      });
      
      // 7. If there's a worksheet URL, prompt the user
      if (result.worksheet_url) {
        toast({
          title: "Practice Worksheet Generated",
          description: "A personalized practice worksheet has been created based on your answers",
          action: (
            <Button 
              onClick={() => window.open(`http://localhost:5000${result.worksheet_url}`, '_blank')}
              variant="outline"
              size="sm"
            >
              Open
            </Button>
          ),
        });
      }
    } catch (error) {
      console.error("Error processing image:", error);
      setIsProcessing(false);
      toast({
        title: "Error",
        description: "There was a problem grading your paper",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setUploadedImage(null);
    setGradingResult(null);
    setIsProcessing(false);
    setProgress(0);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <TeacherHeader />
      
      <main className="flex-grow container mx-auto py-8 px-4">
        {!uploadedImage ? (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-3">Math Paper Grading Assistant</h2>
              <p className="text-gray-600 max-w-lg mx-auto">
                Upload your math assignment and our AI teacher will grade it, provide feedback, and mark errors and corrections.
              </p>
            </div>
            
            <UploadForm onImageUploaded={handleImageUpload} isProcessing={isProcessing} />
            
            <div className="mt-8 text-center">
              <h3 className="font-semibold text-lg mb-3">How it works</h3>
              <div className="flex flex-col md:flex-row justify-center gap-4 text-sm text-gray-600">
                <div className="bg-white p-4 rounded-lg shadow-sm flex-1">
                  <div className="font-semibold mb-1">1. Upload</div>
                  <p>Take a photo of your math paper or upload an existing image</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm flex-1">
                  <div className="font-semibold mb-1">2. Process</div>
                  <p>Our AI teacher analyzes and grades your work using advanced math recognition</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm flex-1">
                  <div className="font-semibold mb-1">3. Review</div>
                  <p>Get detailed feedback and corrections with personalized practice worksheets</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
              <Button variant="ghost" onClick={handleReset} className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <h2 className="text-2xl font-semibold">Your Graded Paper</h2>
              <div className="w-24" />
            </div>
            
            {isProcessing ? (
              <ProcessingIndicator progress={progress} stage={processingStage} />
            ) : gradingResult ? (
              <GradedPaper
                originalImage={uploadedImage}
                grade={gradingResult.grade}
                feedback={gradingResult.feedback}
                markings={gradingResult.markings}
              />
            ) : null}
          </div>
        )}
      </main>
      
      <footer className="bg-white border-t py-6">
        <div className="container mx-auto text-center text-sm text-gray-500">
          <p>Math Teacher Assistant &copy; 2025. Helping students improve one paper at a time.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
