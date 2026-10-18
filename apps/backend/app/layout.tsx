export const metadata = {
  title: 'Laundelle API',
  description: 'Laundelle Backend Services',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
