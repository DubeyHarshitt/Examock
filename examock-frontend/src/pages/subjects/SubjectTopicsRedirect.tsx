// src/pages/subjects/SubjectTopicsRedirect.tsx
// Legacy route: /subjects/:subjectId/topics → the subject page (Chapters tab).
// Kept so old bookmarks / in-app links don't 404 after Notes+Subjects merged
// into the Library.

import { Navigate, useParams } from "react-router-dom";

export default function SubjectTopicsRedirect() {
  const { subjectId } = useParams<{ subjectId: string }>();
  return <Navigate to={`/subjects/${subjectId}?tab=chapters`} replace />;
}
