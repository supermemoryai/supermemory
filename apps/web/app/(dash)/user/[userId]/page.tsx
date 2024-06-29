import { getUserData } from "@/app/actions/fetchers";

async function Page({ params }: { params: { userId: string } }) {
  const userData = await getUserData();

  if (userData.error) {
    return <>Page Error Occured!</>;
  }

  return (
    <div className="max-w-3xl h-full  flex mx-auto w-full flex-col py-24 px-2">
      <p className="text-2xl text-primary py-2">Profile Settings</p>
      <section className="p-4 flex flex-col gap-4 w-full bg-secondary rounded-md">
        <label htmlFor="userName" className="gap-2">
          <div className="opacity-70 text-md">Name</div>
          <input
            type="text"
            value={userData.data?.name || ""}
            disabled
            className="bg-background py-1 px-2 rounded-sm text-lg"
          />
        </label>
        <label htmlFor="email" className="">
          <div className="opacity-70 text-md">Email</div>
          <button
            disabled
            className="bg-background py-1 px-2 rounded-sm text-lg opacity-50"
          >
            {userData.data?.email}
          </button>
        </label>
        <label htmlFor="telegramId" className="items-center">
          <div className="opacity-70 text-md">Telegram Id</div>
          <button
            disabled
            className="bg-background rounded-sm py-1 px-2 opacity-50 text-lg"
          >
            {userData.data?.telegramId ? "Linked" : "Not Linked"}
          </button>
        </label>
      </section>
    </div>
  );
}

export default Page;
