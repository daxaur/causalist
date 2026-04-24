import { CausalistLoader } from "@/components/ui/causalist-loader";

export default function AppLoading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#FAFAF8]">
      <CausalistLoader size={36} />
    </div>
  );
}
