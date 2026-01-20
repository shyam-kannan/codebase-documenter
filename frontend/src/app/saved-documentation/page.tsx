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

export default function SavedDocumentationPage() {
  const router = useRouter();
  const [groupedJobs, setGroupedJobs] = useState<GroupedJobs>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/api/v1/jobs?limit=1000`);

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
  }, []);

  // Filter repositories based on search query
  const filteredRepos = Object.entries(groupedJobs).filter(([githubUrl]) =>
    githubUrl.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredRepos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRepos = filteredRepos.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="animate-pulse space-y-6">
              <div className="h-12 bg-gray-200 rounded-lg w-1/3"></div>
              <div className="h-20 bg-gray-200 rounded-lg"></div>
              <div className="h-20 bg-gray-200 rounded-lg"></div>
              <div className="h-20 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              Saved Documentation
            </h1>
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-xl text-center">
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const repoCount = Object.keys(groupedJobs).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  Saved Documentation
                </h1>
                <p className="text-gray-600">
                  {repoCount} {repoCount === 1 ? "repository" : "repositories"} documented
                </p>
              </div>
              <button
                onClick={() => router.push("/")}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
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
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back to Home
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-6 py-4 pl-12 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 focus:outline-none transition-all"
              />
              <svg
                className="w-6 h-6 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Repository List */}
          {filteredRepos.length === 0 ? (
            <p className="text-gray-600 text-center py-12">
              {searchQuery
                ? "No repositories found matching your search."
                : "No documentation generated yet. Go back to home and submit a GitHub URL to get started!"}
            </p>
          ) : (
            <>
              <div className="space-y-4">
                {currentRepos.map(([githubUrl, jobs]) => {
                  const latestCompleted = jobs.find((job) => job.status === "completed");
                  const latestJob = jobs[0];

                  return (
                    <div
                      key={githubUrl}
                      className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-lg transition-all"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-semibold text-gray-900 mb-3 break-all">
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
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 whitespace-nowrap"
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
                            View Docs
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
                              Processing...
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
                                className="flex items-center justify-between gap-4 text-sm py-2"
                              >
                                <div className="flex items-center gap-3 flex-wrap">
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-all"
                  >
                    Previous
                  </button>

                  <div className="flex gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                              currentPage === page
                                ? "bg-blue-600 text-white"
                                : "border-2 border-gray-300 text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <span key={page} className="px-2 py-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-all"
                  >
                    Next
                  </button>
                </div>
              )}

              {/* Results info */}
              <p className="text-center text-sm text-gray-600 mt-4">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredRepos.length)} of{" "}
                {filteredRepos.length} {filteredRepos.length === 1 ? "repository" : "repositories"}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
