const CrazySpinner = () => {
  return (
    <div className="flex justify-center items-center gap-1.5">
      <div className="h-1.5 w-1.5 animate-ping rounded-full bg-[#369DFD] [animation-delay:-0.4s]" />
      <div className="h-1.5 w-1.5 animate-ping rounded-full bg-[#369DFD] [animation-delay:-0.2s]" />
      <div className="h-1.5 w-1.5 animate-ping rounded-full bg-[#369DFD]" />
    </div>
  );
};

export default CrazySpinner;
