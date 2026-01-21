"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

interface CommentedFile {
  path: string;
  commented_code: string;
  original_code: string;
}

interface CommentedCodeData {
  github_url: string;
  generated_at: string;
  files: CommentedFile[];
}

export default function CommentedCodeViewer() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const jobId = params?.jobId as string;

  const [data, setData] = useState<CommentedCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"split" | "commented">("split");
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const fetchCommentedCode = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/api/v1/jobs/${jobId}/commented-code`);

        if (!response.ok) {
          throw new Error("Failed to fetch commented code");
        }

        const jsonData = await response.json();
        setData(jsonData);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      }
    };

    if (jobId) {
      fetchCommentedCode();
    }
  }, [jobId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950">
        {/* Navigation */}
        <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-white font-bold text-xl">R</span>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">RepoFriend</span>
              </Link>
              <Link
                href="/saved-documentation"
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Saved Docs
              </Link>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950">
        {/* Navigation */}
        <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-white font-bold text-xl">R</span>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">RepoFriend</span>
              </Link>
              <Link
                href="/saved-documentation"
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Saved Docs
              </Link>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Commented Code</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-6">{error || "Commented code not found"}</p>
                <Link
                  href="/saved-documentation"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Saved Docs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedFile = data.files[selectedFileIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">RepoFriend</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link
                href="/saved-documentation"
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Saved Docs
              </Link>

              {session && (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    {session?.user?.image ? (
                      <img
                        src={session.user.image}
                        alt="Profile"
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {session?.user?.name?.charAt(0) || "U"}
                        </span>
                      </div>
                    )}
                    <svg
                      className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${
                        showUserMenu ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 animate-in fade-in slide-in-from-top-2">
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {session?.user?.name || "User"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {session?.user?.email}
                        </p>
                      </div>
                      <button
                        onClick={() => signOut()}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 min-w-0 pr-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  AI-Generated Code Comments
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  <a
                    href={data.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    {data.github_url}
                  </a>
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Generated: {new Date(data.generated_at).toLocaleString()}
                </p>
              </div>
              <Link
                href="/saved-documentation"
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all whitespace-nowrap"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Saved Docs
              </Link>
            </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setViewMode("split")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                viewMode === "split"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              Split View
            </button>
            <button
              onClick={() => setViewMode("commented")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                viewMode === "commented"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              Commented Only
            </button>
          </div>

          {/* File Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {data.files.map((file, index) => (
              <button
                key={index}
                onClick={() => setSelectedFileIndex(index)}
                className={`px-4 py-2 rounded-lg font-mono text-sm whitespace-nowrap transition ${
                  selectedFileIndex === index
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {file.path}
              </button>
            ))}
          </div>
        </div>

        {/* Code Viewer */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {viewMode === "split" ? (
            <div className="grid grid-cols-2 divide-x divide-gray-300 dark:divide-gray-700">
              {/* Original Code */}
              <div className="flex flex-col">
                <div className="bg-gradient-to-r from-gray-800 to-gray-700 dark:from-gray-900 dark:to-gray-800 text-white px-6 py-3 font-semibold">
                  Original Code
                </div>
                <pre className="p-6 overflow-auto text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono leading-relaxed max-h-[calc(100vh-300px)]">
                  <code>{selectedFile.original_code}</code>
                </pre>
              </div>

              {/* Commented Code */}
              <div className="flex flex-col">
                <div className="bg-gradient-to-r from-green-700 to-emerald-700 dark:from-green-800 dark:to-emerald-800 text-white px-6 py-3 font-semibold">
                  With AI Comments
                </div>
                <pre className="p-6 overflow-auto text-sm bg-green-50 dark:bg-green-900/20 text-gray-900 dark:text-gray-100 font-mono leading-relaxed max-h-[calc(100vh-300px)]">
                  <code>{selectedFile.commented_code}</code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="bg-gradient-to-r from-green-700 to-emerald-700 dark:from-green-800 dark:to-emerald-800 text-white px-6 py-3 font-semibold">
                {selectedFile.path} - With AI Comments
              </div>
              <pre className="p-6 overflow-auto text-sm bg-green-50 dark:bg-green-900/20 text-gray-900 dark:text-gray-100 font-mono leading-relaxed max-h-[calc(100vh-250px)]">
                <code>{selectedFile.commented_code}</code>
              </pre>
            </div>
          )}
        </div>

        {/* File Navigation */}
        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={() => setSelectedFileIndex(Math.max(0, selectedFileIndex - 1))}
            disabled={selectedFileIndex === 0}
            className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-600 text-white rounded-lg shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous File
          </button>
          <span className="px-6 py-3 text-gray-700 dark:text-gray-300 font-medium bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            File {selectedFileIndex + 1} of {data.files.length}
          </span>
          <button
            onClick={() =>
              setSelectedFileIndex(Math.min(data.files.length - 1, selectedFileIndex + 1))
            }
            disabled={selectedFileIndex === data.files.length - 1}
            className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-600 text-white rounded-lg shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 transition-all flex items-center gap-2"
          >
            Next File
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
