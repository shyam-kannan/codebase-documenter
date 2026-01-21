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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-center mb-6">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-full w-32"></div>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 px-5 py-4 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold text-sm">Failed to load job status</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
      <div className="space-y-6">
        {/* Status Badge */}
        <div className="flex items-center justify-between pb-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <span
              className={`inline-flex items-center px-5 py-2.5 rounded-full text-base font-semibold shadow-sm ${
                statusColors[job.status]
              }`}
            >
              <span className="mr-2.5 text-xl">{statusIcons[job.status]}</span>
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </span>
          </div>
          {(job.status === "pending" || job.status === "processing") && (
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </div>
          )}
        </div>

        {/* Repository Info */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Repository
          </label>
          <a
            href={job.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 break-all font-medium flex items-center gap-2 group"
          >
            {job.github_url}
            <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {/* Error Message with Expandable */}
        {job.error_message && (
          <div className="animate-in fade-in slide-in-from-top-2">
            <details className="group">
              <summary className="cursor-pointer list-none">
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 px-5 py-4 rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-red-700 dark:text-red-400">Error occurred</p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Click to view details</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </summary>
              <div className="mt-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300 font-mono whitespace-pre-wrap">
                  {job.error_message}
                </p>
              </div>
            </details>
          </div>
        )}

        {/* Action Buttons - Only show when completed */}
        {job.status === "completed" && (
          <div className="pt-4 space-y-3">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Available Actions
            </label>

            {/* Show PR link if available */}
            {job.pull_request_url && (
              <a
                href={job.pull_request_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                View Pull Request with AI Comments
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            )}

            {/* Show documentation or commented code link if available and no PR */}
            {job.documentation_url && !job.pull_request_url && (
              <>
                {job.documentation_url.includes('/commented/') ? (
                  <a
                    href={`/commented-code/${job.id}`}
                    className="group flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    View Commented Code
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                ) : (
                  <a
                    href={`/documentation/${job.id}`}
                    className="group flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View Documentation
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                )}
              </>
            )}

            {/* Add comments button */}
            {!job.pull_request_url && !(job.documentation_url && job.documentation_url.includes('/commented/')) && (
              <button
                onClick={handleAddComments}
                disabled={addingComments}
                className="group flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold rounded-xl shadow-md hover:shadow-lg disabled:shadow-none transition-all duration-200 w-full disabled:cursor-not-allowed"
              >
                {addingComments ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {job.has_write_access ? 'Creating Pull Request...' : 'Generating Comments...'}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {job.has_write_access ? 'Create PR with AI Comments' : 'Add AI Inline Comments'}
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Timestamps */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Created
              </label>
              <p className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {new Date(job.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Updated
              </label>
              <p className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {new Date(job.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
