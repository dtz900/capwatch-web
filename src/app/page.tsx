import { TopNav } from "@/components/nav/TopNav";
import { Hero } from "@/components/leaderboard/Hero";
export default function Home() {
  return (
    <>
      <TopNav />
      <main className="max-w-[1240px] mx-auto px-7">
        <Hero totalCappers={12} totalPicks={947} />
      </main>
    </>
  );
}
