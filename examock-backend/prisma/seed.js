import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
const exam = await prisma.examType.create({
data: { name: "JEE", slug: "jee" },
});

const subject = await prisma.subject.create({
data: { name: "Physics", examTypeId: exam.id },
});

const topic = await prisma.topic.create({
data: { name: "Kinematics", subjectId: subject.id },
});

const question = await prisma.question.create({
data: {
topicId: topic.id,
text: "What is 2 + 2?",
optionA: "3",
optionB: "4",
optionC: "5",
optionD: "6",
correctOption: "B",
},
});

const test = await prisma.mockTest.create({
data: {
title: "Sample Test",
examTypeId: exam.id,
subjectId: subject.id,
topicId: topic.id,
type: "CHAPTER",
isFree: true,
durationMins: 30,
totalMarks: 10,
},
});

await prisma.testQuestion.create({
data: {
testId: test.id,
questionId: question.id,
},
});

console.log("✅ Seed complete");
}

main()
.catch(console.error)
.finally(() => prisma.$disconnect());
