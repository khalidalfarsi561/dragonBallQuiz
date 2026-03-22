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
      className="min-h-screen bg-zinc-950 px-4 py-6 text-white lg:px-6 lg:py-8"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <UserAvatar
                src={avatarSrc}
                alt="User"
                powerLevel={powerLevel}
                size={92}
              />
              <div>
                <h1 className="text-2xl font-black tracking-tight">
                  مرحباً {username}
                </h1>
                <p className="mt-1 text-sm text-white/70">
                  مستوى طاقتك الحالي:
                  <span className="ms-2 font-(--font-ibm-plex-arabic)">
                    {powerLevel.toLocaleString("ar")}
                  </span>
                </p>
              </div>
            </div>

            <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white/80">
              الملف الشخصي
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
