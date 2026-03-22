import AuthModal from "@/components/AuthModal";
import { createPBServerClient } from "@/lib/pocketbase";
import { redirect } from "next/navigation";

export default async function Home() {
  const pb = await createPBServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record?.id) {
    return <AuthModal />;
  }

  redirect("/series");
}
