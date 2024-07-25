export const variants = {
  initial:{
    scale: 0.9,
    opacity: 0.8,
    filter: "blur(3px)",
    y: -50,
  },
  animate:{
    scale: 1,
    opacity: 1,
    filter: "blur(0px)",
    y: -60,
  },
  exit:{
    scale: 0.9,
    y: -50,
    opacity: 0,
    filter: "blur(3px)",
  }
}