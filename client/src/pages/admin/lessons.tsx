import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash } from "lucide-react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Define the lesson validation schema
const lessonSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  languageId: z.coerce.number({ required_error: "Language is required" }),
  type: z.string().min(1, "Type is required"),
  description: z.string().nullable().optional(),
  level: z.coerce.number().min(1).max(5).default(1),
  duration: z.coerce.number().min(1).default(10),
  xpReward: z.coerce.number().min(1).default(10),
  order: z.coerce.number().optional(),
  icon: z.string().nullable().optional(),
});

type LessonFormValues = z.infer<typeof lessonSchema>;

export default function AdminLessons() {
  const [selectedLanguage, setSelectedLanguage] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { toast } = useToast();
  
  // Fetch languages
  const { data: languages, isLoading: isLoadingLanguages } = useQuery({
    queryKey: ['/api/languages'],
    staleTime: 300000, // 5 minutes
  });
  
  // Fetch lessons based on selected language
  const { data: lessons, isLoading: isLoadingLessons } = useQuery({
    queryKey: ['/api/languages', selectedLanguage, 'lessons'],
    enabled: !!selectedLanguage,
    queryFn: () => apiRequest('GET', `/api/languages/${selectedLanguage}/lessons`),
  });
  
  // Create lesson mutation
  const createLesson = useMutation({
    mutationFn: (lesson: LessonFormValues) => 
      apiRequest('POST', '/api/admin/lessons', lesson),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/languages', selectedLanguage, 'lessons'] });
      toast({
        title: "Lesson created",
        description: "The lesson has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating lesson",
        description: error.message || "An error occurred while creating the lesson.",
        variant: "destructive",
      });
    },
  });
  
  // Set up form
  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: "",
      languageId: undefined,
      type: "VOCABULARY",
      description: "",
      level: 1,
      duration: 10,
      xpReward: 10,
      icon: "",
    },
  });
  
  // Effect to update languageId in form when selectedLanguage changes
  useEffect(() => {
    if (selectedLanguage) {
      form.setValue('languageId', selectedLanguage);
    }
  }, [selectedLanguage, form]);
  
  // Handle form submission
  function onSubmit(values: LessonFormValues) {
    createLesson.mutate(values);
  }
  
  if (isLoadingLanguages) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Lesson Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Lesson
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Lesson</DialogTitle>
              <DialogDescription>
                Fill out the form below to create a new lesson.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter lesson title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="languageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {languages?.map((language: any) => (
                            <SelectItem key={language.id} value={language.id.toString()}>
                              {language.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select lesson type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="VOCABULARY">Vocabulary</SelectItem>
                          <SelectItem value="GRAMMAR">Grammar</SelectItem>
                          <SelectItem value="CONVERSATION">Conversation</SelectItem>
                          <SelectItem value="PRONUNCIATION">Pronunciation</SelectItem>
                          <SelectItem value="READING">Reading</SelectItem>
                          <SelectItem value="WRITING">Writing</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter lesson description" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Level (1-5)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" max="5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="xpReward"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>XP Reward</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon (optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter icon name or URL" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        You can use a Lucide icon name or a URL to an image
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createLesson.isPending}>
                    {createLesson.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Lesson
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Lessons</CardTitle>
          <CardDescription>
            Manage lessons across all languages.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="mb-6">
            <Label htmlFor="language-filter">Filter by Language</Label>
            <Select 
              onValueChange={(value) => setSelectedLanguage(parseInt(value))}
              defaultValue={selectedLanguage?.toString()}
            >
              <SelectTrigger className="mt-2 w-full sm:w-[300px]">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {languages?.map((language: any) => (
                  <SelectItem key={language.id} value={language.id.toString()}>
                    {language.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedLanguage ? (
            isLoadingLessons ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableCaption>List of lessons for selected language</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>XP Reward</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lessons?.length ? (
                    lessons?.map((lesson: any) => (
                      <TableRow key={lesson.id}>
                        <TableCell className="font-medium">{lesson.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{lesson.type}</Badge>
                        </TableCell>
                        <TableCell>{lesson.level}</TableCell>
                        <TableCell>{lesson.duration} min</TableCell>
                        <TableCell>{lesson.xpReward} XP</TableCell>
                        <TableCell>{lesson.order}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon">
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        No lessons found for this language. Create a new lesson to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Please select a language to view lessons
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}