"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SubmitUrlForm from "@/components/SubmitUrlForm";
import JobStatus from "@/components/JobStatus";
import AuthButton from "@/components/AuthButton";
import { useBackendAuth } from "@/hooks/useBackendAuth";

export default function Home() {
  const router = useRouter();
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Sync NextAuth session with backend
  useBackendAuth();

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Auth Header */}
      <div className="container mx-auto px-4 pt-6">
        <div className="max-w-4xl mx-auto flex justify-end">
          <AuthButton />
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              AI-Powered Documentation
            </h1>
            <p className="text-2xl text-gray-600 mb-8">
              Transform any GitHub repository into comprehensive documentation
            </p>
            <button
              onClick={() => router.push("/saved-documentation")}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-blue-600 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-blue-200"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                />
              </svg>
              View Saved Documentation
            </button>
          </div>

          {/* Submit URL Form */}
          <div>
            <SubmitUrlForm onJobCreated={setCurrentJobId} />
          </div>

          {/* Job Status */}
          {currentJobId && (
            <div>
              <JobStatus jobId={currentJobId} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
