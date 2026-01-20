"use client";

import { useState } from "react";
import SubmitUrlForm from "@/components/SubmitUrlForm";
import JobStatus from "@/components/JobStatus";
import SavedDocumentation from "@/components/SavedDocumentation";

export default function Home() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [refreshSaved, setRefreshSaved] = useState(0);

  const handleJobCreated = (jobId: string) => {
    setCurrentJobId(jobId);
    // Trigger refresh of saved documentation
    setRefreshSaved((prev) => prev + 1);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              AI-Powered Documentation
            </h1>
            <p className="text-2xl text-gray-600">
              Transform any GitHub repository into comprehensive documentation
            </p>
          </div>

          {/* Submit URL Form */}
          <div>
            <SubmitUrlForm onJobCreated={handleJobCreated} />
          </div>

          {/* Job Status */}
          {currentJobId && (
            <div>
              <JobStatus jobId={currentJobId} />
            </div>
          )}

          {/* Saved Documentation */}
          <div>
            <SavedDocumentation refreshTrigger={refreshSaved} />
          </div>
        </div>
      </div>
    </main>
  );
}
