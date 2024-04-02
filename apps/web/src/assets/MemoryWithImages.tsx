import { svgId } from "@/lib/utils";

export const MemoryWithImage: React.FC<
  { image: string; id: string } & React.SVGAttributes<SVGElement>
> = ({ image, id: _id, ...props }) => {
  const id = "space-1-" + _id;

  return (
    <svg
      viewBox="0 0 137 137"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      {...props}
    >
      <g filter={`url(#${svgId(id, "filter0_d_83_72")})`}>
        <rect
          x="33"
          y="33"
          width="72.207"
          height="72.207"
          rx="10"
          fill="var(--gray-4)"
        />
      </g>
      <rect
        x="47.0637"
        y="46.9976"
        width="45"
        height="45"
        fill={`url(#${svgId(id, "pattern0")})`}
      />
      <defs>
        <filter
          id={svgId(id, "filter0_d_83_72")}
          x="21"
          y="21"
          width="96.207"
          height="96.207"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feMorphology
            radius="2"
            operator="dilate"
            in="SourceAlpha"
            result="effect1_dropShadow_83_72"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="5" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_83_72"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_83_72"
            result="shape"
          />
        </filter>
        <pattern
          id={svgId(id, "pattern0")}
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            xlinkHref={`#${svgId(id, "image0_83_72")}`}
            transform="scale(0.00520833)"
          />
        </pattern>
        <image
          id={svgId(id, "image0_83_72")}
          width="192"
          height="192"
          xlinkHref={image}
        />
      </defs>
    </svg>
  );
};

export const MemoryWithImages2: React.FC<
  { images: string[]; id: string } & React.SVGAttributes<SVGElement>
> = ({ images, id: _id, ...props }) => {
  const id = "space-2-" + _id;

  return (
    <svg
      viewBox="0 0 137 137"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      {...props}
    >
      <g clipPath={`url(#${svgId(id, "clip0_80_62")})`}>
        <g filter={`url(#${svgId(id, "filter0_d_80_62")})`}>
          <rect
            x="7"
            y="51.5427"
            width="72.207"
            height="72.207"
            rx="10"
            transform="rotate(-24.1922 7 51.5427)"
            fill="var(--gray-4)"
          />
        </g>
        <rect
          x="26.2664"
          y="58.9253"
          width="45"
          height="45"
          transform="rotate(-24.2 26.2664 58.9253)"
          fill={`url(#${svgId(id, "pattern0")})`}
        />
        <g filter={`url(#${svgId(id, "filter1_d_80_62")})`}>
          <rect
            x="59.9409"
            y="42.2124"
            width="72.207"
            height="72.207"
            rx="10"
            transform="rotate(10.2301 59.9409 42.2124)"
            fill="var(--gray-4)"
          />
        </g>
        <rect
          x="71.2952"
          y="58.4851"
          width="45"
          height="45"
          transform="rotate(10.23 71.2952 58.4851)"
          fill={`url(#${svgId(id, "pattern1")})`}
        />
      </g>
      <defs>
        <filter
          id={svgId(id, "filter0_d_80_62")}
          x="-1.78271"
          y="13.1697"
          width="113.021"
          height="113.021"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feMorphology
            radius="2"
            operator="dilate"
            in="SourceAlpha"
            result="effect1_dropShadow_80_62"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="5" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_80_62"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_80_62"
            result="shape"
          />
        </filter>
        <pattern
          id={svgId(id, "pattern0")}
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            xlinkHref={`#${svgId(id, "image0_80_62")}`}
            transform="scale(0.0111111)"
          />
        </pattern>
        <filter
          id={svgId(id, "filter1_d_80_62")}
          x="36.7322"
          y="31.8276"
          width="104.652"
          height="104.653"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feMorphology
            radius="2"
            operator="dilate"
            in="SourceAlpha"
            result="effect1_dropShadow_80_62"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="5" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_80_62"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_80_62"
            result="shape"
          />
        </filter>
        <pattern
          id={svgId(id, "pattern1")}
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            xlinkHref={`#${svgId(id, "image1_80_62")}`}
            transform="scale(0.00520833)"
          />
        </pattern>
        <clipPath id={svgId(id, "clip0_80_62")}>
          <rect width="137" height="137" fill="white" />
        </clipPath>
        <image
          id={svgId(id, "image0_80_62")}
          width="90"
          height="90"
          xlinkHref={images[0]}
        />
        <image
          id={svgId(id, "image1_80_62")}
          width="192"
          height="192"
          xlinkHref={images[1]}
        />
      </defs>
    </svg>
  );
};

export const MemoryWithImages3: React.FC<
  { images: string[]; id: string } & React.SVGAttributes<SVGElement>
> = ({ images, id: _id, ...props }) => {
  const id = "space-3-" + _id;

  return (
    <svg
      viewBox="0 0 137 137"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      {...props}
    >
      <g clipPath={`url(#${svgId(id, "clip0_79_36")})`}>
        <g filter={`url(#${svgId(id, "filter0_d_79_36")})`}>
          <rect
            x="53.5242"
            y="12"
            width="72.207"
            height="72.207"
            rx="10"
            transform="rotate(14.9009 53.5242 12)"
            fill="var(--gray-4)"
          />
        </g>
        <rect
          x="63.3663"
          y="27.3052"
          width="45"
          height="45"
          transform="rotate(14.9 63.3663 27.3052)"
          fill={`url(#${svgId(id, "pattern0")})`}
        />
        <g filter={`url(#${svgId(id, "filter1_d_79_36")})`}>
          <rect
            x="7"
            y="51.5427"
            width="72.207"
            height="72.207"
            rx="10"
            transform="rotate(-24.1922 7 51.5427)"
            fill="var(--gray-4)"
          />
        </g>
        <rect
          x="26.2664"
          y="58.9253"
          width="45"
          height="45"
          transform="rotate(-24.2 26.2664 58.9253)"
          fill={`url(#${svgId(id, "pattern1")})`}
        />
        <g filter={`url(#${svgId(id, "filter2_d_79_36")})`}>
          <rect
            x="59.9409"
            y="42.2124"
            width="72.207"
            height="72.207"
            rx="10"
            transform="rotate(10.2301 59.9409 42.2124)"
            fill="var(--gray-4)"
          />
        </g>
        <rect
          x="71.2952"
          y="58.4851"
          width="45"
          height="45"
          transform="rotate(10.23 71.2952 58.4851)"
          fill={`url(#${svgId(id, "pattern2")})`}
        />
      </g>
      <defs>
        <filter
          id={svgId(id, "filter0_d_79_36")}
          x="25.189"
          y="2.23267"
          width="107.881"
          height="107.881"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feMorphology
            radius="2"
            operator="dilate"
            in="SourceAlpha"
            result="effect1_dropShadow_79_36"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="5" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_79_36"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_79_36"
            result="shape"
          />
        </filter>
        <pattern
          id={svgId(id, "pattern0")}
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            xlinkHref={`#${svgId(id, "image0_79_36")}`}
            transform="scale(0.0111111)"
          />
        </pattern>
        <filter
          id={svgId(id, "filter1_d_79_36")}
          x="-1.78271"
          y="13.1697"
          width="113.021"
          height="113.021"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feMorphology
            radius="2"
            operator="dilate"
            in="SourceAlpha"
            result="effect1_dropShadow_79_36"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="5" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_79_36"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_79_36"
            result="shape"
          />
        </filter>
        <pattern
          id={svgId(id, "pattern1")}
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            xlinkHref={`#${svgId(id, "image1_79_36")}`}
            transform="scale(0.0111111)"
          />
        </pattern>
        <filter
          id={svgId(id, "filter2_d_79_36")}
          x="36.7322"
          y="31.8276"
          width="104.652"
          height="104.653"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feMorphology
            radius="2"
            operator="dilate"
            in="SourceAlpha"
            result="effect1_dropShadow_79_36"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="5" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_79_36"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_79_36"
            result="shape"
          />
        </filter>
        <pattern
          id={svgId(id, "pattern2")}
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            xlinkHref={`#${svgId(id, "image2_79_36")}`}
            transform="scale(0.00520833)"
          />
        </pattern>
        <clipPath id={svgId(id, "clip0_79_36")}>
          <rect width="137" height="137" fill="white" />
        </clipPath>
        <image
          id={svgId(id, "image0_79_36")}
          width="90"
          height="90"
          xlinkHref={images[0]}
        />
        <image
          id={svgId(id, "image1_79_36")}
          width="90"
          height="90"
          xlinkHref={images[1]}
        />
        <image
          id={svgId(id, "image2_79_36")}
          width="192"
          height="192"
          xlinkHref={images[2]}
        />
      </defs>
    </svg>
  );
};
