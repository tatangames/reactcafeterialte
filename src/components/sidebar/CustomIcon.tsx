type Props = {
  src: string;
  alt: string;
  className?: string;
};

const CustomIcon: React.FC<Props> = ({ src, alt, className }) => {
  return (
    <img
      src={src}
      alt={alt}
      className={`w-5 h-5 ${className ?? ""}`}
    />
  );
};

export default CustomIcon;
