import { db } from '../lib/db';
import { Spinner } from '../components/Spinner';

const sourceIcon: Record<string, string> = {
  Google: '🔵',
  Yelp: '🔴',
  'In-app': '⭐',
};

export function ReviewsPage() {
  const { isLoading, error, data } = db.useQuery({ reviews: {} });

  if (isLoading) return <Spinner />;
  if (error) return <div className="p-8 text-red-600">Error: {error.message}</div>;

  const reviews = [...(data?.reviews ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const avg = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const unReplied = reviews.filter((r) => !r.replied).length;

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reviews</h1>
          <p className="mt-1 text-gray-500">
            {reviews.length} total · {unReplied} awaiting reply
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-indigo-50 px-5 py-3">
          <span className="text-2xl font-bold text-indigo-600">{avg.toFixed(1)}</span>
          <div>
            <div className="flex text-yellow-400 text-sm">
              {'★'.repeat(Math.round(avg))}{'☆'.repeat(5 - Math.round(avg))}
            </div>
            <p className="text-xs text-gray-500">avg rating</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-lg font-bold text-indigo-600">
                  {review.author[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{review.author}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>{sourceIcon[review.source] ?? '💬'} {review.source}</span>
                    <span>·</span>
                    <span>
                      {new Date(review.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-yellow-400">
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                </div>
                {review.replied ? (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                    Replied
                  </span>
                ) : (
                  <button className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-200">
                    Reply
                  </button>
                )}
              </div>
            </div>
            <p className="mt-4 leading-relaxed text-gray-600">{review.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
