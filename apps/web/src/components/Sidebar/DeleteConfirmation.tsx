import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "../ui/dialog";

export default function DeleteConfirmation({
  onDelete,
  trigger = true,
  children,
}: {
  trigger?: boolean;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      {trigger ? (
        <DialogTrigger asChild>{children}</DialogTrigger>
      ) : (
        <>{children}</>
      )}
      <DialogContent>
        <DialogTitle className="text-xl">Are you sure?</DialogTitle>
        <DialogDescription className="text-md">
          You will not be able to recover this it.
        </DialogDescription>
        <DialogFooter>
          <DialogClose
            type={undefined}
            onClick={onDelete}
            className="ml-auto flex items-center justify-center rounded-md bg-red-100/10 px-3 py-2 text-red-400 transition hover:bg-red-100/5 focus-visible:bg-red-100/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-100/30"
          >
            Delete
          </DialogClose>
          <DialogClose className="focus-visible:bg-rgray-4 focus-visible:ring-rgray-7 hover:bg-rgray-4 ml-auto flex items-center justify-center rounded-md px-3 py-2 transition focus-visible:outline-none focus-visible:ring-2">
            Cancel
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
