import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ChatSettingsPanelProps {
  model: string;
  temperature: number; // 0-200 (represents 0.0-2.0)
  maxTokens: number;
  topP: number; // 0-100 (represents 0.0-1.0)
  systemInstructions: string;
  onModelChange: (model: string) => void;
  onTemperatureChange: (temp: number) => void;
  onMaxTokensChange: (tokens: number) => void;
  onTopPChange: (topP: number) => void;
  onSystemInstructionsChange: (instructions: string) => void;
}

const MODELS = [
  { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", available: true },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", available: false },
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro Preview",
    available: false,
  },
  { id: "perplexity", name: "Perplexity", available: false },
];

export function ChatSettingsPanel({
  model,
  temperature,
  maxTokens,
  topP,
  systemInstructions,
  onModelChange,
  onTemperatureChange,
  onMaxTokensChange,
  onTopPChange,
  onSystemInstructionsChange,
}: ChatSettingsPanelProps) {
  const [isSystemInstructionsOpen, setIsSystemInstructionsOpen] =
    useState(false);
  const selectedModel = MODELS.find((m) => m.id === model);

  return (
    <div className="w-[320px] h-full bg-[#f8f9fa] border-l border-[#dadce0] flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#202124]">モデル</Label>
            <Select value={model} onValueChange={onModelChange}>
              <SelectTrigger className="bg-white border-[#dadce0] text-[#202124] h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id} disabled={!m.available}>
                    <div className="flex items-center gap-2">
                      <span>{m.name}</span>
                      {!m.available && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-[#fef7e0] text-[#b06000] border-[#fde293]"
                        >
                          準備中
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedModel && !selectedModel.available && (
              <p className="text-xs text-[#b06000]">
                このモデルは現在準備中です
              </p>
            )}
          </div>

          {/* System Instructions */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
              onClick={() =>
                setIsSystemInstructionsOpen(!isSystemInstructionsOpen)
              }
            >
              <Label className="text-sm font-medium text-[#202124] cursor-pointer">
                System instructions
              </Label>
              {isSystemInstructionsOpen ? (
                <ChevronDown className="h-4 w-4 text-[#5f6368]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#5f6368]" />
              )}
            </Button>

            {isSystemInstructionsOpen && (
              <Textarea
                value={systemInstructions}
                onChange={(e) => onSystemInstructionsChange(e.target.value)}
                placeholder="システムプロンプトを入力..."
                className="min-h-[100px] bg-white border-[#dadce0] text-[#202124] text-sm resize-none"
              />
            )}
          </div>

          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-[#202124]">
                Temperature
              </Label>
              <span className="text-sm text-[#5f6368] font-mono">
                {(temperature / 100).toFixed(2)}
              </span>
            </div>
            <Slider
              min={0}
              max={200}
              step={1}
              value={[temperature]}
              onValueChange={([value]) => onTemperatureChange(value)}
              className="w-full"
            />
            <p className="text-xs text-[#5f6368]">
              低い値: より決定的、高い値: よりランダム
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#202124]">
              Maximum tokens
            </Label>
            <Input
              type="number"
              min={1}
              max={8192}
              value={maxTokens}
              onChange={(e) =>
                onMaxTokensChange(parseInt(e.target.value) || 4096)
              }
              className="bg-white border-[#dadce0] text-[#202124] h-10"
            />
            <p className="text-xs text-[#5f6368]">
              生成する最大トークン数 (1-8192)
            </p>
          </div>

          {/* Top P */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-[#202124]">
                Top P
              </Label>
              <span className="text-sm text-[#5f6368] font-mono">
                {(topP / 100).toFixed(2)}
              </span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[topP]}
              onValueChange={([value]) => onTopPChange(value)}
              className="w-full"
            />
            <p className="text-xs text-[#5f6368]">
              核サンプリング: 考慮するトークンの割合
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
