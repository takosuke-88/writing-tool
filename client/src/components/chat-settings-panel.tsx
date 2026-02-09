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
  isSystemInstructionsOpen: boolean;
  onModelChange: (model: string) => void;
  onTemperatureChange: (temp: number) => void;
  onMaxTokensChange: (tokens: number) => void;
  onTopPChange: (topP: number) => void;
  onSystemInstructionsChange: (instructions: string) => void;
  onSystemInstructionsOpenChange: (open: boolean) => void;
  searchMode: string;
  onSearchModeChange: (mode: string) => void;
}

const MODELS = [
  { id: "auto", name: "Auto (最適モデル自動選択)", available: true }, // NEW
  {
    id: "claude-sonnet-4-5",
    name: "Claude 4.5 Sonnet",
    available: true,
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash (Stable)",
    available: true,
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    available: true,
  },
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro Preview",
    available: false,
  },
  {
    id: "sonar-pro",
    name: "Perplexity (Online)",
    available: true,
  },
];

export function ChatSettingsPanel({
  model,
  temperature,
  maxTokens,
  topP,
  systemInstructions,
  isSystemInstructionsOpen,
  onModelChange,
  onTemperatureChange,
  onMaxTokensChange,
  onTopPChange,
  onSystemInstructionsChange,
  onSystemInstructionsOpenChange,
  searchMode,
  onSearchModeChange,
}: ChatSettingsPanelProps) {
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

          {/* Search Mode Selection - NEW */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#202124]">
              検索設定
            </Label>
            <Select value={searchMode} onValueChange={onSearchModeChange}>
              <SelectTrigger className="bg-white border-[#dadce0] text-[#202124] h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">自動 (Auto)</SelectItem>
                <SelectItem value="high_precision">
                  高精度 (Perplexity)
                </SelectItem>
                <SelectItem value="standard">標準 (Claude)</SelectItem>
                <SelectItem value="eco">節約 (Eco)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-[#5f6368]">
              {searchMode === "auto" && "AIが最適な検索ツールを自動選択します"}
              {searchMode === "high_precision" &&
                "Perplexity APIを使用 (高コスト・高精度)"}
              {searchMode === "standard" &&
                "Claude Web Searchを使用 (中コスト)"}
              {searchMode === "eco" && "無料検索APIを使用 (低コスト)"}
            </p>
          </div>

          {/* System Instructions */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
              onClick={() =>
                onSystemInstructionsOpenChange(!isSystemInstructionsOpen)
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
              max={100}
              step={1}
              value={[temperature]}
              onValueChange={([value]) => onTemperatureChange(value)}
              className="w-full"
            />
            <p className="text-xs text-[#5f6368]">
              低い値: より決定的、高い値: よりランダム (0.00-1.00)
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
