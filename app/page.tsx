export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="text-center p-8">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
          MedExNet
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
          Medical Expert Network
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/about"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </a>
          <a
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Learn More
          </a>
        </div>
      </main>
    </div>
  );
}
