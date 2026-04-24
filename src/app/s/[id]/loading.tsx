import { CausalistLoader } from "@/components/ui/causalist-loader";

export default function ShareLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#FAFAF8]">
      <CausalistLoader size={40} caption="Opening shared graph" />
    </div>
  );
}
