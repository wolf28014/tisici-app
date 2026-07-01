'use client'

import * as React from 'react'
import {
  PenTool, Code2, TrendingUp, GraduationCap, Briefcase, Heart,
  Palette, MoreHorizontal, BookOpen, Lightbulb, Sparkles, Star,
  Target, Rocket, Compass, Bot, MessageSquare, FileText, Zap,
  ShoppingBag, Snowflake, Shirt, Mountain, PersonStanding,
  Image as ImageIcon, Megaphone, Clapperboard, LayoutGrid,
  Video, Music, Scissors, Tag as TagIcon,
  Folder, FolderOpen, Settings2, Key, Cloud, Wand2,
  Download, Upload, Share2, Copy, Check, X, Plus, Trash2, Pencil,
  Pin, Clock, User, Hash, Search, Eye, History, RotateCcw,
  Loader2, ChevronRight, GripVertical, Layers,
  CheckSquare, FolderPlus, AlertCircle, RefreshCw, Save, Filter,
  Globe, Link, Mail, Phone, MapPin, Calendar, Database,
  Server, Cpu, Wifi, Lock, Unlock, Settings, Bell, Volume2,
  Play, Pause, SkipForward, SkipBack, FastForward,
  Camera, Film, Mic, Headphones, Speaker, Radio, Tv,
  Book, Brush, Coffee, Pizza, Apple, Car, Plane, Train, Bike,
  Sun, Moon, CloudRain, CloudSnow, Wind, Umbrella,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  PenTool, Code2, TrendingUp, GraduationCap, Briefcase, Heart,
  Palette, MoreHorizontal, BookOpen, Lightbulb, Sparkles, Star,
  Target, Rocket, Compass, Bot, MessageSquare, FileText, Zap,
  ShoppingBag, Snowflake, Shirt, Mountain, PersonStanding,
  Image: ImageIcon, Megaphone, Clapperboard, LayoutGrid,
  Video, Music, Scissors, Tag: TagIcon,
  Folder, FolderOpen, Settings2, Key, Cloud, Wand2,
  Download, Upload, Share2, Copy, Check, X, Plus, Trash2, Pencil,
  Pin, Clock, User, Hash, Search, Eye, History, RotateCcw,
  Loader2, ChevronRight, GripVertical, Layers,
  CheckSquare, FolderPlus, AlertCircle, RefreshCw, Save, Filter,
  Globe, Link, Mail, Phone, MapPin, Calendar, Database,
  Server, Cpu, Wifi, Lock, Unlock, Settings, Bell, Volume2,
  Play, Pause, SkipForward, SkipBack, FastForward,
  Camera, Film, Mic, Headphones, Speaker, Radio, Tv,
  Book, Brush, Coffee, Pizza, Apple, Car, Plane, Train, Bike,
  Sun, Moon, CloudRain, CloudSnow, Wind, Umbrella,
}

export type CategoryIconProps = {
  name?: string | null
  className?: string
}

export function CategoryIcon({ name, className }: CategoryIconProps) {
  const Icon = (name && ICONS[name]) || MoreHorizontal
  return <Icon className={className} />
}

export const ICON_NAMES = Object.keys(ICONS)
