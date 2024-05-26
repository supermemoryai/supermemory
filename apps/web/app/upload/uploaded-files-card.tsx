import Image from "next/image";
// import type { UploadedFile } from '@repo/shared-types';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/src/shadcn/card";
import { ScrollArea, ScrollBar } from "@repo/ui/src/shadcn/scroll-area";

interface UploadedFilesCardProps {
  uploadedFiles: any[];
}

import { ImageIcon } from "@radix-ui/react-icons";

import { cn } from "@repo/ui/lib/utils";

interface EmptyCardProps extends React.ComponentPropsWithoutRef<typeof Card> {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

function EmptyCard({
  title,
  description,
  icon: Icon = ImageIcon,
  action,
  className,
  ...props
}: EmptyCardProps) {
  return (
    <Card
      className={cn(
        "flex w-full flex-col items-center justify-center space-y-6 bg-transparent p-16",
        className,
      )}
      {...props}
    >
      <div className="mr-4 shrink-0 rounded-full border border-dashed p-4">
        <Icon className="size-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="flex flex-col items-center gap-1.5 text-center">
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </div>
      {action ? action : null}
    </Card>
  );
}

export function UploadedFilesCard({ uploadedFiles }: UploadedFilesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Uploaded files</CardTitle>
        <CardDescription>View the uploaded files here</CardDescription>
      </CardHeader>
      <CardContent>
        {uploadedFiles.length > 0 ? (
          <ScrollArea className="pb-4">
            <div className="flex w-max space-x-2.5">
              {uploadedFiles.map((file) => (
                <div key={file.key} className="relative aspect-video w-64">
                  <Image
                    src={file.url}
                    alt={file.name}
                    fill
                    sizes="(min-width: 640px) 640px, 100vw"
                    loading="lazy"
                    className="rounded-md object-cover"
                  />
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          <EmptyCard
            title="No files uploaded"
            description="Upload some files to see them here"
            className="w-full"
          />
        )}
      </CardContent>
    </Card>
  );
}
