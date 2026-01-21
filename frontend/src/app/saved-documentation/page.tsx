"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Job {
  id: string;
  github_url: string;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  documentation_url: string | null;
  pull_request_url: string | null;
  has_write_access: boolean;
  created_at: string;
  updated_at: string;
}

interface GroupedJobs {
  [githubUrl: string]: Job[];
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

export default function SavedDocumentationPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [groupedJobs, setGroupedJobs] = useState<GroupedJobs>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingJobs, setDeletingJobs] = useState<Set<string>>(new Set());
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

  const handleDeleteJobs = async (githubUrl: string) => {
    if (!confirm(`Are you sure you want to delete all documentation for ${githubUrl}?`)) {
      return;
    }

    const jobIds = groupedJobs[githubUrl].map(job => job.id);
    setDeletingJobs(new Set([...deletingJobs, ...jobIds]));

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // Delete all jobs for this repo
      await Promise.all(
        jobIds.map(jobId =>
          fetch(`${apiUrl}/api/v1/jobs/${jobId}`, { method: "DELETE" })
        )
      );

      // Remove from state
      const newGroupedJobs = { ...groupedJobs };
      delete newGroupedJobs[githubUrl];
      setGroupedJobs(newGroupedJobs);

      // Check if current page is now empty after deletion
      const remainingRepos = Object.entries(newGroupedJobs).filter(([url]) =>
        url.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const newTotalPages = Math.ceil(remainingRepos.length / itemsPerPage);

      // If current page is now beyond the total pages, go to the last valid page
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      } else if (remainingRepos.length === 0) {
        // If no repos left, reset to page 1
        setCurrentPage(1);
      }

      setDeletingJobs(new Set());
    } catch (err) {
      console.error("Failed to delete jobs:", err);
      setDeletingJobs(new Set());
      alert("Failed to delete documentation. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950">
        {/* Navigation */}
        <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">R</span>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">RepoFriend</span>
              </Link>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
            <div className="animate-pulse space-y-6">
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3"></div>
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950">
        {/* Navigation */}
        <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">R</span>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">RepoFriend</span>
              </Link>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Saved Documentation
            </h1>
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 px-5 py-4 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-semibold text-sm">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const repoCount = Object.keys(groupedJobs).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">RepoFriend</span>
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Documentation
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Saved Documentation
                </h1>
                <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  {repoCount} {repoCount === 1 ? "repository" : "repositories"} documented
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <svg
                className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2"
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
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-12 pr-6 py-4 text-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-800 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Repository List */}
          {filteredRepos.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                {searchQuery
                  ? "No repositories found matching your search."
                  : "No documentation generated yet. Create your first documentation to get started!"}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {currentRepos.map(([githubUrl, jobs]) => {
                  const latestCompleted = jobs.find((job) => job.status === "completed");
                  const latestJob = jobs[0];
                  const hasCommentedCode = latestCompleted?.documentation_url?.includes('/commented/');
                  const hasPR = latestCompleted?.pull_request_url;
                  const isDeleting = deletingJobs.has(latestJob.id);

                  return (
                    <div
                      key={githubUrl}
                      className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all bg-white dark:bg-gray-800 relative"
                    >
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteJobs(githubUrl)}
                        disabled={isDeleting}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete all documentation for this repository"
                      >
                        {isDeleting ? (
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>

                      <div className="flex flex-col gap-4 pr-12">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 break-all">
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
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {jobs.length} {jobs.length === 1 ? "version" : "versions"}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              Last updated: {new Date(latestJob.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {latestCompleted && (
                          <div className="flex flex-col gap-3">
                            {/* PR with Comments Button */}
                            {hasPR && (
                              <a
                                href={latestCompleted.pull_request_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                </svg>
                                View Pull Request with AI Comments
                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                              </a>
                            )}

                            {/* Commented Code Button (if no PR, but has commented code) */}
                            {!hasPR && hasCommentedCode && (
                              <a
                                href={`/commented-code/${latestCompleted.id}`}
                                className="group flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                                View Commented Code
                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                              </a>
                            )}

                            {/* Documentation Button */}
                            <button
                              onClick={() => router.push(`/documentation/${latestCompleted.id}`)}
                              className="group flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              View Documentation
                              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            </button>
                          </div>
                        )}

                        {/* Status Messages for Non-Completed Jobs */}
                        {!latestCompleted && latestJob.status === "failed" && (
                          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            Generation failed
                          </div>
                        )}

                        {!latestCompleted &&
                          (latestJob.status === "pending" || latestJob.status === "processing") && (
                            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </div>
                          )}
                      </div>

                      {/* Show all versions if there are multiple */}
                      {jobs.length > 1 && (
                        <details className="mt-4 group">
                          <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium flex items-center gap-2">
                            <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            Show all {jobs.length} versions
                          </summary>
                          <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
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
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {new Date(job.created_at).toLocaleString()}
                                  </span>
                                </div>
                                {job.status === "completed" && (
                                  <button
                                    onClick={() => router.push(`/documentation/${job.id}`)}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center gap-1"
                                  >
                                    View
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
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
                    className="px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
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
                                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                                : "border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <span key={page} className="px-2 py-2 text-gray-500 dark:text-gray-400">
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
                    className="px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    Next
                  </button>
                </div>
              )}

              {/* Results info */}
              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
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
