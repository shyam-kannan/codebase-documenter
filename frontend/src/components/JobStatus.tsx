"use client";

import { useState, useEffect } from "react";

interface JobStatusProps {
  jobId: string;
}


interface Job {
  id: string;
  github_url: string;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  documentation_url: string | null;
  has_write_access: boolean;
  pull_request_url: string | null;
  created_at: string;
  updated_at: string;
}


const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
};

const statusIcons = {
  pending: "⏳",
  processing: "⚙️",
  completed: "✅",
  failed: "❌",
};

export default function JobStatus({ jobId }: JobStatusProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingComments, setAddingComments] = useState(false);

  useEffect(() => {
    const fetchJobStatus = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/api/v1/jobs/${jobId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch job status");
        }

        const data: Job = await response.json();
        setJob(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchJobStatus();

    // Poll every 5 seconds if job is pending or processing
    const interval = setInterval(() => {
      if (job?.status === "pending" || job?.status === "processing") {
        fetchJobStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [jobId, job?.status]);

  const handleAddComments = async () => {
    if (!job) return;

    setAddingComments(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/v1/jobs/${job.id}/add-comments`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to trigger comment generation");
      }

      const updatedJob: Job = await response.json();
      setJob(updatedJob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start comment generation");
    } finally {
      setAddingComments(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded-lg w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded-lg w-full"></div>
          <div className="h-4 bg-gray-200 rounded-lg w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl mx-auto">
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-xl text-center">
          {error}
        </div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl mx-auto">
      <div className="space-y-6">
        <div className="text-center pb-6 border-b-2 border-gray-100">
          <span
            className={`inline-flex items-center px-6 py-3 rounded-full text-lg font-semibold shadow-md ${
              statusColors[job.status]
            }`}
          >
            <span className="mr-3 text-2xl">{statusIcons[job.status]}</span>
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </span>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-500 mb-2">
            Repository
          </label>
          <p className="text-lg text-gray-900 break-all font-medium">
            {job.github_url}
          </p>
        </div>

        {job.error_message && (
          <div>
            <label className="block text-sm font-semibold text-gray-500 mb-2">
              Error Message
            </label>
            <p className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border-2 border-red-200">
              {job.error_message}
            </p>
          </div>
        )}

        {job.status === "completed" && (
          <div className="pt-4 space-y-4">
            {/* Show PR link if available */}
            {job.pull_request_url && (
              <a
                href={job.pull_request_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Pull Request with AI Comments
              </a>
            )}

            {/* Show documentation or commented code link if available and no PR */}
            {job.documentation_url && !job.pull_request_url && (
              <a
                href={`/documentation/${job.id}`}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View Documentation
              </a>
            )}

            {/* Add comments button - only show if no PR created yet */}
            {!job.pull_request_url && (
              <button
                onClick={handleAddComments}
                disabled={addingComments}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-lg w-full"
              >
                {addingComments ? (
                  <>
                    <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding AI Comments...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {job.has_write_access ? 'Create PR with AI Comments' : 'Add AI Inline Comments'}
                  </>
                )}
              </button>
            )}
          </div>
        )}

        <div className="pt-4 border-t-2 border-gray-100">
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <label className="block font-semibold text-gray-500 mb-1">
                Created
              </label>
              <p className="text-gray-700">
                {new Date(job.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block font-semibold text-gray-500 mb-1">
                Updated
              </label>
              <p className="text-gray-700">
                {new Date(job.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
