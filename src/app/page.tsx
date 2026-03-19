import QuizUI from "@/components/QuizUI";
import { getOnePublicQuestion } from "@/lib/questions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const question = await getOnePublicQuestion();

  return <QuizUI question={question} />;
}
