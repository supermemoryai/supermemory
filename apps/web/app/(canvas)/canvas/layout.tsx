import "../canvasStyles.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div lang="en" className="bg-[#151515]">
      <div>{children}</div>
    </div>
  );
}
