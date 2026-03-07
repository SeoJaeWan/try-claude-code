import { CardGrid, type CardGridItem } from "./CardGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Demo page showing the CardGrid component in action with sample data.
 */
export default function CardGridDemo() {
  const sampleItems: CardGridItem[] = [
    {
      id: "1",
      title: "Project Alpha",
      description: "A next-generation dashboard for analytics.",
      image: { src: "/images/alpha.jpg", alt: "Project Alpha screenshot" },
      content: (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Built with React, TypeScript, and Tailwind CSS. Features real-time
            data visualisation and role-based access control.
          </p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary">React</Badge>
            <Badge variant="secondary">TypeScript</Badge>
            <Badge variant="secondary">Tailwind</Badge>
          </div>
        </div>
      ),
      footer: (
        <div className="flex w-full gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            Details
          </Button>
          <Button size="sm" className="flex-1">
            Open
          </Button>
        </div>
      ),
    },
    {
      id: "2",
      title: "Design System",
      description: "Unified component library for all products.",
      content: (
        <p className="text-sm text-muted-foreground">
          A comprehensive set of reusable UI primitives following accessibility
          best practices and consistent design tokens.
        </p>
      ),
      footer: (
        <Button variant="outline" size="sm" className="w-full">
          View Docs
        </Button>
      ),
    },
    {
      id: "3",
      title: "API Gateway",
      description: "Centralized API management layer.",
      image: { src: "/images/gateway.jpg", alt: "API Gateway diagram" },
      content: (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Handles rate limiting, authentication, and request routing across
            all micro-services.
          </p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary">Go</Badge>
            <Badge variant="secondary">gRPC</Badge>
          </div>
        </div>
      ),
    },
    {
      id: "4",
      title: "Mobile App",
      description: "Cross-platform companion app.",
      content: (
        <p className="text-sm text-muted-foreground">
          React Native application available on iOS and Android with offline
          support and push notifications.
        </p>
      ),
      footer: (
        <div className="flex w-full gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            iOS
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            Android
          </Button>
        </div>
      ),
    },
    {
      id: "5",
      title: "Data Pipeline",
      description: "ETL workflows for business intelligence.",
      content: (
        <p className="text-sm text-muted-foreground">
          Apache Spark-based pipeline processing terabytes of data daily with
          fault-tolerant orchestration.
        </p>
      ),
    },
    {
      id: "6",
      title: "Infrastructure",
      description: "Cloud-native deployment platform.",
      image: { src: "/images/infra.jpg", alt: "Infrastructure overview" },
      content: (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Kubernetes-based platform with GitOps workflows, automated scaling,
            and multi-region support.
          </p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary">K8s</Badge>
            <Badge variant="secondary">Terraform</Badge>
            <Badge variant="secondary">ArgoCD</Badge>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="text-muted-foreground">
          Browse our portfolio of active projects and services.
        </p>
      </div>

      {/* Default: 1 col on mobile, 2 on md, 3 on lg */}
      <CardGrid items={sampleItems} columns={{ sm: 1, md: 2, lg: 3 }} gap={6} />
    </div>
  );
}
