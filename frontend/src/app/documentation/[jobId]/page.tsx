"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Job {
  id: string;
  github_url: string;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  documentation_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function DocumentationViewer() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [markdown, setMarkdown] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch job details
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const jobResponse = await fetch(`${apiUrl}/api/v1/jobs/${jobId}`);

        if (!jobResponse.ok) {
          const errorText = await jobResponse.text();
          console.error("Job fetch error:", errorText);
          throw new Error(`Failed to fetch job details: ${jobResponse.status} ${jobResponse.statusText}`);
        }

        const jobData: Job = await jobResponse.json();
        console.log("Job data:", jobData);
        setJob(jobData);

        // Fetch markdown from backend API (which proxies S3)
        if (jobData.documentation_url) {
          console.log("Fetching documentation via API for job:", jobId);

          const markdownResponse = await fetch(`${apiUrl}/api/v1/jobs/${jobId}/documentation`);

          if (!markdownResponse.ok) {
            const errorText = await markdownResponse.text();
            console.error("Markdown fetch error:", markdownResponse.status, errorText);
            throw new Error(`Failed to fetch documentation: ${markdownResponse.status}`);
          }

          const markdownText = await markdownResponse.text();
          console.log("Markdown fetched successfully, length:", markdownText.length);
          setMarkdown(markdownText);
        } else {
          setError("Documentation not yet available for this job");
        }
      } catch (err) {
        console.error("Full error:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchData();
    }
  }, [jobId]);

  const handleDownload = () => {
    if (!markdown || !job) return;

    // Trigger browser print dialog (user can save as PDF)
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded-lg w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded-lg w-full"></div>
            <div className="h-4 bg-gray-200 rounded-lg w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl mx-auto">
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-5 rounded-xl text-center">
            {error || "Documentation not found"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Documentation
                </h1>
                <p className="text-lg text-gray-600 break-all">
                  {job.github_url}
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 print:hidden"
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download as PDF
              </button>
            </div>
            <button
              onClick={() => router.push("/saved-documentation")}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl shadow hover:shadow-lg transition-all duration-200 print:hidden"
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
              Back to Saved Docs
            </button>
          </div>
        </div>

        {/* Documentation Content */}
        <div className="bg-white rounded-2xl shadow-2xl p-12">
          <article className="prose prose-lg prose-slate max-w-none">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {markdown}
            </ReactMarkdown>
          </article>
        </div>
      </div>
    </div>
  );
}
