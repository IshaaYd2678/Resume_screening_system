type InsightBoxProps = {
  message: string;
};

export default function InsightBox({ message }: InsightBoxProps) {
  const [first, ...rest] = message.split(" ");

  return (
    <aside className="rounded-lg bg-zinc-100 p-5 text-base leading-7 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
      <p className="line-clamp-2">
        <span className="font-bold text-zinc-950 dark:text-white">{first}</span>{" "}
        {rest.join(" ")}
      </p>
    </aside>
  );
}
