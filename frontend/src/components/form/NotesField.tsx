import { forwardRef } from "react";

import { Textarea, type TextareaProps } from "../ui/Textarea";

export type NotesFieldProps = TextareaProps;

export const NotesField = forwardRef<
  HTMLTextAreaElement,
  NotesFieldProps
>(function NotesField(props, ref) {
  return <Textarea ref={ref} rows={4} {...props} />;
});
