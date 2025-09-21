#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
人脸过滤工具
功能：遍历源路径中的所有图片，通过人脸识别API筛选出匹配的图片，并复制到目标路径
用法：python3 face_filter.py <源路径> <目标路径>
"""

import os
import sys
import requests
import json
import shutil
from datetime import datetime
import time

# API服务器地址
API_URL = "http://localhost:8000/recognize"

# 支持的图片格式
supported_formats = ['.jpg', '.jpeg', '.png', '.bmp', '.gif']


def is_image_file(filename):
    """检查文件是否为支持的图片格式"""
    ext = os.path.splitext(filename)[1].lower()
    return ext in supported_formats


def get_docker_path(local_path):
    """将本地路径转换为Docker容器内的路径"""
    # 获取当前工作目录
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # 构建Docker内部映射路径
    docker_path = local_path.replace(current_dir, "/app")
    # 确保路径使用正斜杠
    docker_path = docker_path.replace('\\', '/')
    return docker_path


def recognize_face(image_path):
    """调用人脸识别API识别图片中的人脸，返回匹配结果和置信度"""
    max_retries = 3
    retry_delay = 2  # 秒
    
    for attempt in range(max_retries):
        try:
            # 检查图片文件是否存在
            if not os.path.isfile(image_path):
                print(f"[错误] 图片文件不存在: {image_path}")
                return False, None
            
            # 检查文件大小
            file_size = os.path.getsize(image_path)
            if file_size == 0:
                print(f"[错误] 图片文件为空: {image_path}")
                return False, None
                
            # 调用API进行人脸识别
            with open(image_path, 'rb') as file:
                files = {'file': (os.path.basename(image_path), file, 'image/jpeg')}
                response = requests.post(API_URL, files=files, timeout=30)
            
            # 检查状态码
            if response.status_code != 200:
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    continue
                return False, None
            
            # 尝试解析JSON响应
            try:
                result = response.json()
                
                # 获取匹配结果和置信度
                match = result.get('match', False)
                confidence = result.get('confidence', None)
                
                return match, confidence
            except ValueError:
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    continue
                return False, None
            
        except requests.exceptions.ConnectionError:
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                continue
            return False, None
        except requests.exceptions.Timeout:
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                continue
            return False, None
        except Exception:
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                continue
            return False, None
    
    return False, None


def filter_and_copy_images(source_dir, target_dir):
    """过滤图片并复制匹配的图片到目标目录"""
    # 检查源目录是否存在
    if not os.path.exists(source_dir):
        print(f"错误: 源目录不存在: {source_dir}")
        return False
    
    # 检查目标目录是否存在，如果不存在则创建
    if not os.path.exists(target_dir):
        try:
            os.makedirs(target_dir)
        except Exception:
            print(f"创建目标目录失败: {target_dir}")
            return False
    
    # 初始化计数器
    total_files = 0
    matched_files = 0
    copied_files = 0
    skipped_files = 0
    
    # 遍历源目录中的所有文件
    for root, dirs, files in os.walk(source_dir):
        for file in files:
            # 检查文件是否为图片
            if is_image_file(file):
                total_files += 1
                
                # 构建完整的文件路径
                source_path = os.path.join(root, file)
                
                # 调用API进行人脸识别
                is_matched, confidence = recognize_face(source_path)
                
                # 打印图片匹配状态和置信度
                if confidence is not None:
                    confidence_percentage = confidence * 100
                    match_status = "✓ 匹配成功" if is_matched else "✗ 未匹配"
                    print(f"{file}: {match_status}, 置信度: {confidence_percentage:.2f}%")
                else:
                    print(f"{file}: ✗ 未匹配 (未检测到人脸)")
                
                # 如果匹配成功，则复制到目标目录
                if is_matched:
                    matched_files += 1
                    
                    # 保持原始文件名
                    target_path = os.path.join(target_dir, file)
                    
                    # 检查目标目录是否已存在相同文件名的文件
                    if os.path.exists(target_path):
                        print(f"{file}: 已存在于目标目录，跳过复制")
                        skipped_files += 1
                        continue
                    
                    try:
                        # 复制文件
                        shutil.copy2(source_path, target_path)
                        copied_files += 1
                        print(f"{file}: 成功复制到目标目录")
                    except Exception as e:
                        print(f"{file}: 复制失败 - {str(e)}")
    
    # 打印统计信息
    print(f"\n识别完成！总共扫描图片: {total_files}, 匹配成功图片: {matched_files}, 复制成功: {copied_files}, 跳过已存在文件: {skipped_files}")
    
    return True


def print_usage():
    """打印使用说明"""
    print("用法：python3 face_filter.py <源路径> <目标路径>")


if __name__ == "__main__":
    # 检查命令行参数
    if len(sys.argv) != 3:
        print_usage()
        sys.exit(1)
    
    # 获取源路径和目标路径
    source_dir = os.path.abspath(sys.argv[1])
    target_dir = os.path.abspath(sys.argv[2])
    
    # 执行过滤和复制操作
    success = filter_and_copy_images(source_dir, target_dir)
    
    # 根据执行结果返回相应的退出码
    sys.exit(0 if success else 1)