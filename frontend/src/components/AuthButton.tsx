"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse">
        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
        <div className="h-4 w-20 bg-gray-300 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (session) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all group">
        {session.user?.image ? (
          <img
            src={session.user.image}
            alt={session.user.name || "User"}
            className="w-8 h-8 rounded-full ring-2 ring-gray-200 dark:ring-gray-700 group-hover:ring-gray-300 dark:group-hover:ring-gray-600 transition-all"
          />
        ) : (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center ring-2 ring-gray-200 dark:ring-gray-700">
            <span className="text-white font-semibold text-sm">
              {session.user?.name?.charAt(0) || "U"}
            </span>
          </div>
        )}
        <div className="text-left">
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-none">
            {session.user?.name || session.user?.username || "User"}
          </p>
          {session.user?.username && (
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-none mt-0.5">
              @{session.user.username}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("github")}
      className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 dark:from-gray-800 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
    >
      <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
        <path
          fillRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          clipRule="evenodd"
        />
      </svg>
      Sign in with GitHub
    </button>
  );
}
