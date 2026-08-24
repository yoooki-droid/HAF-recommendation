const state = { days: "7", timer: null };

const elements = {
  visitors: document.querySelector("#visitor-count"),
  favoriters: document.querySelector("#favoriter-count"),
  favoriteTotal: document.querySelector("#favorite-total"),
  conversion: document.querySelector("#conversion-rate"),
  conversionFill: document.querySelector("#conversion-fill"),
  conversionCopy: document.querySelector("#conversion-copy"),
  updatedAt: document.querySelector("#updated-at"),
  trend: document.querySelector("#trend-chart"),
  courseRows: document.querySelector("#course-rows"),
  courseEmpty: document.querySelector("#course-empty"),
  courseSummary: document.querySelector("#course-summary"),
};

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(value ?? 0);
}

function renderTrend(items) {
  if (!items.length || !items.some((item) => item.visitors || item.favoriters)) {
    elements.trend.innerHTML = '<div class="trend-empty">新的访问和收藏会从这里慢慢出现</div>';
    return;
  }
  const max = Math.max(1, ...items.flatMap((item) => [item.visitors, item.favoriters]));
  elements.trend.innerHTML = items.map((item) => {
    const visitorHeight = Math.max(3, Math.round((item.visitors / max) * 185));
    const favoriterHeight = Math.max(3, Math.round((item.favoriters / max) * 185));
    return `<div class="trend-day" title="${item.date} · 访问 ${item.visitors} · 收藏用户 ${item.favoriters}">
      <div class="trend-bars"><i class="trend-bar visitors" style="height:${visitorHeight}px"></i><i class="trend-bar favoriters" style="height:${favoriterHeight}px"></i></div>
      <label>${item.label}</label>
    </div>`;
  }).join("");
}

function renderCourses(courses) {
  const hasCourses = courses.length > 0;
  elements.courseEmpty.classList.toggle("hidden", hasCourses);
  elements.courseRows.innerHTML = courses.map((course) => `<tr><td>${escapeHtml(course.title)}</td><td>${formatNumber(course.users)}</td><td>${formatNumber(course.total)}</td></tr>`).join("");
  elements.courseSummary.textContent = hasCourses ? `共 ${courses.length} 节课程产生收藏` : "暂无收藏";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function render(summary) {
  elements.visitors.textContent = formatNumber(summary.visitors);
  elements.favoriters.textContent = formatNumber(summary.favoriters);
  elements.favoriteTotal.textContent = formatNumber(summary.favorite_total);
  elements.conversion.textContent = `${summary.conversion_rate.toFixed(1)}%`;
  elements.conversionFill.style.width = `${Math.min(100, summary.conversion_rate)}%`;
  elements.conversionCopy.textContent = summary.visitors
    ? `每 100 位访问者中，约有 ${Math.round(summary.conversion_rate)} 位至少收藏过一节课程。`
    : "有数据后，这里会显示访问者中有多少人完成过收藏。";
  elements.updatedAt.textContent = `更新于 ${new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(summary.generated_at))}`;
  renderTrend(summary.trend);
  renderCourses(summary.courses);
}

async function refresh() {
  try {
    const response = await fetch(`/api/summary?days=${state.days}`, { cache: "no-store" });
    if (!response.ok) throw new Error("summary unavailable");
    render(await response.json());
  } catch {
    elements.updatedAt.textContent = "等待数据服务";
  }
}

document.querySelectorAll("[data-days]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-days]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.days = button.dataset.days;
    void refresh();
  });
});

void refresh();
state.timer = window.setInterval(refresh, 5000);
