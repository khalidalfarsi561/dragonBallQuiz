import AuthModal from "@/components/AuthModal";
import UserAvatar from "@/components/UserAvatar";
import type { UserRecord } from "@/lib/pocketbase";
import { createPBServerClient } from "@/lib/pocketbase";

export default async function QuizProfilePage() {
  const pb = await createPBServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record?.id) {
    return <AuthModal />;
  }

  const userId = pb.authStore.record.id;
  const user = await pb
    .collection<UserRecord>("users")
    .getOne(userId, { requestKey: `me_${userId}` });

  const powerLevel = Number(user.power_level ?? 0);
  const username = user.display_name || user.username;
  const avatarSrc = user.avatar_url || "/vercel.svg";

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-6 text-white lg:px-6 lg:py-8"
    >
      <div className="mx-auto flex w-full max-w-md justify-center">
        <div className="flex h-[88vh] w-full flex-col justify-between rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
            <UserAvatar
              src={avatarSrc}
              alt="User"
              powerLevel={powerLevel}
              size={112}
            />
            <div className="w-full space-y-3">
              <h1 className="truncate text-2xl font-black tracking-tight">
                مرحباً {username}
              </h1>
              <p className="truncate text-sm text-white/70">
                مستوى طاقتك الحالي:
                <span className="ms-2 font-(--font-ibm-plex-arabic)">
                  {powerLevel.toLocaleString("ar")}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
