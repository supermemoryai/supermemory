import "../canvasStyles.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div lang="en" className="bg-[#171B1F]">
      <div>{children}</div>
    </div>
  );
}
