"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Job {
  id: string;
  github_url: string;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  documentation_url: string | null;
  created_at: string;
  updated_at: string;
}

interface GroupedJobs {
  [githubUrl: string]: Job[];
}

interface SavedDocumentationProps {
  refreshTrigger?: number;
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const statusIcons = {
  pending: "⏳",
  processing: "⚙️",
  completed: "✅",
  failed: "❌",
};

export default function SavedDocumentation({ refreshTrigger }: SavedDocumentationProps) {
  const router = useRouter();
  const [groupedJobs, setGroupedJobs] = useState<GroupedJobs>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/api/v1/jobs?limit=100`);

        if (!response.ok) {
          throw new Error("Failed to fetch jobs");
        }

        const jobs: Job[] = await response.json();

        // Group jobs by GitHub URL
        const grouped: GroupedJobs = {};
        jobs.forEach((job) => {
          if (!grouped[job.github_url]) {
            grouped[job.github_url] = [];
          }
          grouped[job.github_url].push(job);
        });

        // Sort each group by created_at (newest first)
        Object.keys(grouped).forEach((url) => {
          grouped[url].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });

        setGroupedJobs(grouped);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          Saved Documentation
        </h2>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded-lg"></div>
          <div className="h-20 bg-gray-200 rounded-lg"></div>
          <div className="h-20 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          Saved Documentation
        </h2>
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-xl text-center">
          {error}
        </div>
      </div>
    );
  }

  const repoCount = Object.keys(groupedJobs).length;

  if (repoCount === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          Saved Documentation
        </h2>
        <p className="text-gray-600 text-center py-8">
          No documentation generated yet. Submit a GitHub URL above to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">
        Saved Documentation
      </h2>
      <p className="text-gray-600 mb-6">
        {repoCount} {repoCount === 1 ? "repository" : "repositories"} documented
      </p>

      <div className="space-y-6">
        {Object.entries(groupedJobs).map(([githubUrl, jobs]) => {
          // Get the most recent completed job
          const latestCompleted = jobs.find((job) => job.status === "completed");
          const latestJob = jobs[0];

          return (
            <div
              key={githubUrl}
              className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 break-all">
                    {githubUrl}
                  </h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                        statusColors[latestJob.status]
                      }`}
                    >
                      <span className="mr-2">{statusIcons[latestJob.status]}</span>
                      {latestJob.status.charAt(0).toUpperCase() + latestJob.status.slice(1)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {jobs.length} {jobs.length === 1 ? "version" : "versions"}
                    </span>
                    <span className="text-sm text-gray-500">
                      Last updated: {new Date(latestJob.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {latestCompleted && (
                  <button
                    onClick={() => router.push(`/documentation/${latestCompleted.id}`)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <svg
                      className="w-5 h-5"
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
                  </button>
                )}

                {!latestCompleted && latestJob.status === "failed" && (
                  <span className="text-sm text-red-600 font-medium">
                    Generation failed
                  </span>
                )}

                {!latestCompleted &&
                  (latestJob.status === "pending" || latestJob.status === "processing") && (
                    <span className="text-sm text-blue-600 font-medium">
                      Currently processing...
                    </span>
                  )}
              </div>

              {/* Show all versions if there are multiple */}
              {jobs.length > 1 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 font-medium">
                    Show all {jobs.length} versions
                  </summary>
                  <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-200">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between gap-4 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                              statusColors[job.status]
                            }`}
                          >
                            {statusIcons[job.status]} {job.status}
                          </span>
                          <span className="text-gray-600">
                            {new Date(job.created_at).toLocaleString()}
                          </span>
                        </div>
                        {job.status === "completed" && (
                          <button
                            onClick={() => router.push(`/documentation/${job.id}`)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
