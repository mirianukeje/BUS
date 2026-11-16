import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>Between Us</h1>
      <p>A space to check in with your emotions and reflect on your experiences.</p>
      <nav aria-label="Main navigation">
        <ul>
          <li><Link href="/check-in">Daily check-in</Link></li>
          <li><Link href="/journal">Journal</Link></li>
        </ul>
      </nav>
    </main>
  );
}
