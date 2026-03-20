import { redirect } from "next/navigation";
import { createPBServerClient } from "@/lib/pocketbase";
import ProfileClient from "./profile-client";

export default async function ProfilePage() {
  const pb = await createPBServerClient();
  const user = pb.authStore.record;

  if (!user) redirect("/");

  return <ProfileClient />;
}
