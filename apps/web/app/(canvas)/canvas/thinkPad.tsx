import {motion} from "framer-motion"
import Link from "next/link";

const childVariants = {
  hidden: { opacity: 0, y: 10, filter: "blur(2px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

export default function ThinkPad({
  title,
  description,
  image,
  id
}: {
  title: string;
  description: string;
  image: string;
  id: string;
}) {
  return (
    <motion.div
      variants={childVariants}
      className="flex h-48  gap-4 rounded-2xl bg-[#1F2428] p-2"
    >
      <Link className="h-full min-w-[40%] rounded-xl bg-[#363f46]" href={`/canvas/${id}`}>
      <div></div>
      </Link>
      <div className="flex flex-col gap-2">
        <div>{title}</div>
        <div className="overflow-hidden text-ellipsis text-[#B8C4C6]">
          {description}
        </div>
      </div>
    </motion.div>
  );
}