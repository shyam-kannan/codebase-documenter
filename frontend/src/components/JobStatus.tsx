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

        {job.status === "completed" && job.documentation_url && (
          <div className="pt-4">
            <a
              href={`/documentation/${job.id}`}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              View Documentation
            </a>
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
