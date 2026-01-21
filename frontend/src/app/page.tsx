"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AuthButton from "@/components/AuthButton";

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();

  const handleGetStarted = () => {
    if (session) {
      router.push("/dashboard");
    } else {
      // Trigger sign in
      router.push("/api/auth/signin");
    }
  };

  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                RepoFriend
              </span>
            </div>
            <AuthButton />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950 dark:via-purple-950 dark:to-pink-950 opacity-50"></div>

        <div className="container mx-auto px-6 py-24 relative">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-8">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              AI-Powered Documentation
            </div>

            {/* Main Headline */}
            <h1 className="text-6xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight leading-tight">
              AI-Powered Documentation
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                for Every Repository
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Transform any GitHub repository into comprehensive documentation in minutes.
              Perfect for onboarding new engineers and understanding complex codebases.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <button
                onClick={handleGetStarted}
                className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-lg flex items-center gap-2"
              >
                Get Started Free
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </button>
              <button
                onClick={scrollToFeatures}
                className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-lg border-2 border-gray-200 dark:border-gray-700"
              >
                Learn More
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">100+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Repos Documented</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">&lt;5min</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Processing Time</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">10K+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Code Comments Added</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Powerful AI-driven features to make documentation effortless
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                AI Documentation Generation
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Automatically generate comprehensive documentation with setup instructions, architecture overview, and API references.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Intelligent Code Comments
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Add high-value inline comments explaining complex logic, business rules, and non-obvious decisions directly in your code.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Private Repository Support
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Securely process private repositories with encrypted token storage. Your code never leaves your control.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Fast Parallel Processing
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Process multiple files concurrently with optimized AI workflows. Get results in minutes, not hours.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Automatic Pull Requests
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                For repos with write access, automatically create PRs with commented code ready for review and merge.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Cloud Storage Integration
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Documentation is automatically saved to S3 with shareable links for easy access and collaboration.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Get from repository to documentation in four simple steps
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Timeline Line */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-blue-600 to-purple-600"></div>

              {/* Step 1 */}
              <div className="relative mb-16 md:flex md:items-center md:justify-between">
                <div className="md:w-5/12 md:text-right">
                  <div className="inline-block bg-gradient-to-br from-blue-600 to-blue-700 text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
                    Step 1
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Connect GitHub
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Sign in with your GitHub account to access both public and private repositories.
                  </p>
                </div>
                <div className="hidden md:block md:w-2/12 flex justify-center">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">1</span>
                  </div>
                </div>
                <div className="md:w-5/12"></div>
              </div>

              {/* Step 2 */}
              <div className="relative mb-16 md:flex md:items-center md:justify-between">
                <div className="md:w-5/12"></div>
                <div className="hidden md:block md:w-2/12 flex justify-center">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">2</span>
                  </div>
                </div>
                <div className="md:w-5/12">
                  <div className="inline-block bg-gradient-to-br from-purple-600 to-purple-700 text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
                    Step 2
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Submit Repository URL
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Paste any GitHub repository URL and let our AI analyze the codebase structure.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative mb-16 md:flex md:items-center md:justify-between">
                <div className="md:w-5/12 md:text-right">
                  <div className="inline-block bg-gradient-to-br from-pink-600 to-pink-700 text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
                    Step 3
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    AI Analyzes Codebase
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    AI reads your code, understands the architecture, and generates comprehensive documentation.
                  </p>
                </div>
                <div className="hidden md:block md:w-2/12 flex justify-center">
                  <div className="w-12 h-12 bg-pink-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">3</span>
                  </div>
                </div>
                <div className="md:w-5/12"></div>
              </div>

              {/* Step 4 */}
              <div className="relative md:flex md:items-center md:justify-between">
                <div className="md:w-5/12"></div>
                <div className="hidden md:block md:w-2/12 flex justify-center">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">4</span>
                  </div>
                </div>
                <div className="md:w-5/12">
                  <div className="inline-block bg-gradient-to-br from-green-600 to-green-700 text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
                    Step 4
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Get Documentation + PR
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Receive comprehensive docs and optionally create a PR with AI-generated code comments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Document Your Codebase?
          </h2>
          <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
            Join developers who are saving hours on documentation with AI-powered tools.
          </p>
          <button
            onClick={handleGetStarted}
            className="group px-10 py-5 bg-white hover:bg-gray-100 text-gray-900 font-bold rounded-xl shadow-2xl hover:shadow-3xl transition-all duration-200 text-xl flex items-center gap-3 mx-auto"
          >
            Get Started Free
            <svg
              className="w-6 h-6 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                RepoFriend
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              © 2024 RepoFriend. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
