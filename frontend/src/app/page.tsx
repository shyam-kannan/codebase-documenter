"use client";

import { useState } from "react";
import SubmitUrlForm from "@/components/SubmitUrlForm";
import JobStatus from "@/components/JobStatus";

export default function Home() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Codebase Documentation System
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Generate comprehensive documentation for any GitHub repository
            </p>
          </div>

          {/* Submit URL Form */}
          <div className="mb-8">
            <SubmitUrlForm onJobCreated={setCurrentJobId} />
          </div>

          {/* Job Status */}
          {currentJobId && (
            <div className="mt-8">
              <JobStatus jobId={currentJobId} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
