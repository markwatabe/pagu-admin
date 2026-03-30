export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-6 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Pagu Admin</p>
      </div>
    </footer>
  );
}
