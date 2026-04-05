export default function ProductDetailLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        <div className="space-y-4">
          <div className="h-8 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-5 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-10 w-1/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-4" />
          <div className="space-y-2 mt-6">
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-4/6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mt-6" />
        </div>
      </div>
    </div>
  );
}
